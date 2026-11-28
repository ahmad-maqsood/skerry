//! Live wallpaper (Settings → Advanced): a muted, looping video behind the desktop icons, off by
//! default. Each screen pauses while a maximized or full-screen window hides its desktop and
//! carries on from the same frame when the desktop shows again.

mod model;
mod service;

use std::{
    fs,
    path::PathBuf,
    sync::{Mutex, PoisonError},
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use model::{Settings, Status};

/// Mirrored by LIVE_WALLPAPER_STATUS_EVENT in src/features/live-wallpaper/api.ts.
const STATUS_EVENT: &str = "live-wallpaper-status";
/// In the app data directory: read at startup, before any window loads. Left out of configuration
/// transfer, as the video's path belongs to this computer.
const SETTINGS_FILE: &str = "live-wallpaper.json";

/// The switches and the running thread; locked for a whole change, so changes never overlap.
struct Control {
    settings: Settings,
    worker: Option<service::Worker>,
}

static CONTROL: Mutex<Control> = Mutex::new(Control {
    settings: Settings { enabled: false, path: String::new(), fit: model::Fit::Fill, pause_on_battery: true },
    worker: None,
});
/// Apart from CONTROL: the worker reports while a change may be waiting for it to stop.
static STATUS: Mutex<Status> = Mutex::new(Status::Off);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveWallpaperState {
    settings: Settings,
    status: Status,
}

fn report(app: &AppHandle, status: Status) {
    *STATUS.lock().unwrap_or_else(PoisonError::into_inner) = status.clone();
    let _ = app.emit(STATUS_EVENT, status);
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|dir| dir.join(SETTINGS_FILE)).map_err(|error| error.to_string())
}

fn apply(app: &AppHandle, control: &mut Control, next: Settings) {
    let same_video = control.settings.path == next.path;
    control.settings = next;
    let settings = control.settings.clone();
    if settings.wants_player() && same_video {
        let failed = matches!(*STATUS.lock().unwrap_or_else(PoisonError::into_inner), Status::Error(_));
        if let (Some(worker), false) = (&control.worker, failed) {
            // Only the scaling or the power rule changed: the video carries on where it is.
            worker.set_options(settings.fit, settings.pause_on_battery);
            return;
        }
    }
    if let Some(worker) = control.worker.take() {
        worker.stop();
    }
    if !settings.wants_player() {
        report(app, if settings.enabled { Status::NoVideo } else { Status::Off });
        return;
    }
    report(app, Status::Starting);
    let handle = app.clone();
    control.worker = Some(service::Worker::start(settings.path, settings.fit, settings.pause_on_battery, move |status| report(&handle, status)));
}

fn state(control: &Control) -> LiveWallpaperState {
    LiveWallpaperState {
        settings: control.settings.clone(),
        status: STATUS.lock().unwrap_or_else(PoisonError::into_inner).clone(),
    }
}

/// Starts the wallpaper if it was left on.
pub(crate) fn init(app: &AppHandle) {
    let saved = settings_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str::<Settings>(&text).ok())
        .unwrap_or_default();
    apply(app, &mut CONTROL.lock().unwrap_or_else(PoisonError::into_inner), saved);
}

/// Closes the wallpaper windows as the app exits.
pub(crate) fn shutdown() {
    let worker = CONTROL.lock().unwrap_or_else(PoisonError::into_inner).worker.take();
    if let Some(worker) = worker {
        worker.stop();
    }
}

#[tauri::command]
pub async fn get_live_wallpaper() -> LiveWallpaperState {
    state(&CONTROL.lock().unwrap_or_else(PoisonError::into_inner))
}

#[tauri::command]
pub async fn set_live_wallpaper(app: AppHandle, settings: Settings) -> Result<LiveWallpaperState, String> {
    let path = settings_path(&app)?;
    let text = serde_json::to_string(&settings).map_err(|error| error.to_string())?;
    let mut control = CONTROL.lock().unwrap_or_else(PoisonError::into_inner);
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }
    fs::write(&path, text).map_err(|error| format!("Could not save the live wallpaper setting: {error}"))?;
    apply(&app, &mut control, settings);
    Ok(state(&control))
}

/// The file picker; `None` when it is cancelled.
#[tauri::command]
pub async fn pick_live_wallpaper_video(window: tauri::WebviewWindow, title: String) -> Result<Option<String>, String> {
    let owner = window.hwnd().map_err(|error| error.to_string())?.0 as isize;
    // The dialog needs a single-threaded apartment, so it gets a thread of its own.
    std::thread::spawn(move || {
        crate::win32::file_dialog::choose_video(owner, &title).map_err(|error| error.to_string())
    })
    .join()
    .map_err(|_| "The file picker closed unexpectedly.".to_string())?
}

/// This module's Tauri commands. `lib.rs` chains every module's list into one
/// `generate_handler!`, so adding a command only touches this file.
macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::live_wallpaper::get_live_wallpaper,
            crate::live_wallpaper::set_live_wallpaper,
            crate::live_wallpaper::pick_live_wallpaper_video,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
