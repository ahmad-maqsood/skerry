//! Desktop widgets (Settings → Advanced → Widgets): small movable windows on the desktop, each off
//! by default and created only while switched on. The first is the clock. A widget's window sits
//! at the bottom of the window order, takes no focus (so dragging it never lifts it over an app)
//! and is left out of Desktop Duplication, which is how it reads what is behind it to pick colours.

mod backdrop;
mod model;
mod sampler;

use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex, MutexGuard, PoisonError,
    },
};

use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow, WebviewWindowBuilder};

use backdrop::Backdrop;
use model::{reachable, Position, Settings, WidgetsState};

/// The clock's window label, matched by the `widget-*` entry in capabilities/default.json.
pub(crate) const CLOCK_LABEL: &str = "widget-clock";
/// In the app data directory, read at startup.
const SETTINGS_FILE: &str = "widgets.json";
/// Gap from the screen's right and top edge where a widget first appears, in logical pixels.
const FIRST_MARGIN_RIGHT: f64 = 80.0;
const FIRST_MARGIN_TOP: f64 = 100.0;

static SETTINGS: Mutex<Settings> = Mutex::new(Settings { clock: false, clock_position: None });
/// Whether the clock window could be left out of Desktop Duplication (Windows 10 1709 and later).
static CLOCK_EXCLUDED: AtomicBool = AtomicBool::new(false);

fn settings() -> MutexGuard<'static, Settings> {
    SETTINGS.lock().unwrap_or_else(PoisonError::into_inner)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|dir| dir.join(SETTINGS_FILE)).map_err(|error| error.to_string())
}

fn save(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let text = serde_json::to_string(settings).map_err(|error| error.to_string())?;
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    }
    fs::write(path, text).map_err(|error| format!("Could not save the widget settings: {error}"))
}

/// Where the window goes: the saved place if it can still be reached, else near the top right of
/// the screen it would open on.
fn place(app: &AppHandle, window: &WebviewWindow) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let size = window.outer_size().map_or((560, 230), |size| (size.width as i32, size.height as i32));
    let monitors = app.available_monitors().unwrap_or_default();
    let screens: Vec<(i32, i32, i32, i32)> = monitors
        .iter()
        .map(|monitor| {
            let (position, extent) = (monitor.position(), monitor.size());
            (position.x, position.y, position.x + extent.width as i32, position.y + extent.height as i32)
        })
        .collect();
    let saved = settings().clock_position.filter(|position| reachable(*position, size, &screens));
    let target = saved.or_else(|| {
        let monitor = app.primary_monitor().ok().flatten().or_else(|| monitors.first().cloned())?;
        let area = monitor.work_area();
        Some(Position {
            x: area.position.x + area.size.width as i32 - size.0 - (FIRST_MARGIN_RIGHT * scale) as i32,
            y: area.position.y + (FIRST_MARGIN_TOP * scale) as i32,
        })
    });
    if let Some(target) = target {
        let _ = window.set_position(PhysicalPosition::new(target.x, target.y));
    }
}

fn open_clock(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(CLOCK_LABEL) {
        return window.show().map_err(|error| error.to_string());
    }
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == CLOCK_LABEL)
        .ok_or_else(|| "The clock widget's window config was not found.".to_string())?
        .clone();
    let window = WebviewWindowBuilder::from_config(app, &config)
        .map_err(|error| error.to_string())?
        .visible(false)
        .build()
        .map_err(|error| error.to_string())?;
    let excluded = window.hwnd().is_ok_and(|handle| crate::win32::desktop_duplication::exclude_from_capture(handle, true));
    CLOCK_EXCLUDED.store(excluded, Ordering::Relaxed);
    place(app, &window);
    window.show().map_err(|error| error.to_string())
}

/// Keeps where the clock is now, for the next start.
fn remember_clock_position(app: &AppHandle) {
    let Some(window) = app.get_webview_window(CLOCK_LABEL) else { return };
    let Ok(position) = window.outer_position() else { return };
    let mut current = settings();
    let next = Some(Position { x: position.x, y: position.y });
    if current.clock_position != next {
        current.clock_position = next;
        let copy = current.clone();
        drop(current);
        if let Err(error) = save(app, &copy) {
            eprintln!("widgets: {error}");
        }
    }
}

fn close_clock(app: &AppHandle) {
    remember_clock_position(app);
    if let Some(window) = app.get_webview_window(CLOCK_LABEL) {
        let _ = window.destroy();
    }
}

/// Opens the widgets that were left on.
pub(crate) fn init(app: &AppHandle) {
    let saved = settings_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str::<Settings>(&text).ok())
        .unwrap_or_default();
    *settings() = saved.clone();
    if saved.clock {
        if let Err(error) = open_clock(app) {
            eprintln!("failed to open the clock widget: {error}");
        }
    }
}

/// Keeps the positions as the app exits.
pub(crate) fn shutdown(app: &AppHandle) {
    remember_clock_position(app);
}

#[tauri::command]
pub async fn get_widgets() -> WidgetsState {
    settings().state()
}

#[tauri::command]
pub async fn set_widget(app: AppHandle, widget: String, enabled: bool) -> Result<WidgetsState, String> {
    if widget != "clock" {
        return Err(format!("Unknown widget: {widget}"));
    }
    if !enabled {
        close_clock(&app);
    }
    let snapshot = {
        let mut current = settings();
        current.clock = enabled;
        current.clone()
    };
    save(&app, &snapshot)?;
    if enabled {
        open_clock(&app)?;
    }
    Ok(snapshot.state())
}

/// Called by the widget after it has been dragged, so the place survives a restart.
#[tauri::command]
pub async fn save_widget_position(app: AppHandle) {
    remember_clock_position(&app);
}

/// What is behind the clock right now; `None` where that cannot be read, in which case the
/// widget keeps its fallback colours.
#[tauri::command]
pub async fn sample_widget_backdrop(app: AppHandle) -> Result<Option<Backdrop>, String> {
    if !CLOCK_EXCLUDED.load(Ordering::Relaxed) {
        return Ok(None);
    }
    let window = app.get_webview_window(CLOCK_LABEL).ok_or_else(|| "The clock widget is not open.".to_string())?;
    let handle = window.hwnd().map_err(|error| error.to_string())?.0 as isize;
    tauri::async_runtime::spawn_blocking(move || sampler::sample(handle))
        .await
        .map_err(|error| error.to_string())?
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::widgets::get_widgets,
            crate::widgets::set_widget,
            crate::widgets::save_widget_position,
            crate::widgets::sample_widget_backdrop,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
