//! The thread that owns the wallpaper windows and players. It exists only while the live
//! wallpaper is on with a video chosen: off, nothing runs and no media library is loaded.

use std::{
    sync::mpsc::{self, Receiver, Sender, TryRecvError},
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

use windows::Win32::Foundation::RECT;

use super::model::{
    is_recoverable, paused_for_power, playback_error, recovery_delay, source_rect, Fit, Status, MAX_RECOVERIES, STABLE_AFTER,
};
use crate::win32::{
    self,
    desktop_layer::{self, DesktopLayer, DesktopSurface},
    display_state::{self, DisplayWatcher},
    power,
    video_player::{MediaRuntime, VideoPlayer},
};

const TICK_MS: u32 = 100;
/// How often the open windows, monitors and desktop are looked at.
const CHECK_EVERY: Duration = Duration::from_millis(500);
/// How long to wait before rebuilding after Explorer went away.
const RETRY_AFTER: Duration = Duration::from_secs(2);

enum Command {
    SetOptions { fit: Fit, pause_on_battery: bool },
    Stop,
}

pub(super) struct Worker {
    commands: Sender<Command>,
    thread: JoinHandle<()>,
}

impl Worker {
    pub(super) fn start(
        path: String,
        fit: Fit,
        pause_on_battery: bool,
        report: impl Fn(Status) + Send + 'static,
    ) -> Self {
        let (commands, receiver) = mpsc::channel();
        let thread = thread::spawn(move || {
            if let Err(message) = run(&path, fit, pause_on_battery, &receiver, &report) {
                eprintln!("live wallpaper stopped: {message}");
                report(Status::Error(message));
            }
        });
        Self { commands, thread }
    }

    pub(super) fn set_options(&self, fit: Fit, pause_on_battery: bool) {
        let _ = self.commands.send(Command::SetOptions { fit, pause_on_battery });
    }

    /// Returns once the windows are gone and the video file is closed.
    pub(super) fn stop(self) {
        let _ = self.commands.send(Command::Stop);
        let _ = self.thread.join();
    }
}

/// One monitor's video. Field order matters: the player lets go of the window before it closes.
struct Screen {
    player: VideoPlayer,
    surface: DesktopSurface,
    monitor: RECT,
    laid_out: Option<Fit>,
    /// Where to carry on after a rebuild, in seconds.
    resume_at: f64,
}

fn build(runtime: &MediaRuntime, path: &str, monitors: &[RECT], resume_at: f64) -> Result<Vec<Screen>, String> {
    let layer = DesktopLayer::find()?;
    monitors
        .iter()
        .map(|&monitor| {
            let surface = DesktopSurface::new(layer, monitor)?;
            let player = VideoPlayer::open(runtime, surface.video_window(), path)?;
            Ok(Screen { player, surface, monitor, laid_out: None, resume_at })
        })
        .collect()
}

fn run(
    path: &str,
    mut fit: Fit,
    mut pause_on_battery: bool,
    commands: &Receiver<Command>,
    report: &dyn Fn(Status),
) -> Result<(), String> {
    if !std::path::Path::new(path).is_file() {
        return Err("The video file was not found. Choose it again.".to_string());
    }
    let runtime = MediaRuntime::start()?;
    // Without it the video just keeps playing when the screen is off, so a failure is not fatal.
    let _display = match DisplayWatcher::start() {
        Ok(watcher) => Some(watcher),
        Err(message) => {
            eprintln!("live wallpaper: screen-off detection unavailable: {message}");
            None
        }
    };
    let mut screens: Vec<Screen> = Vec::new();
    let mut built_for: Vec<RECT> = Vec::new();
    let mut covered: Vec<RECT> = Vec::new();
    let mut power = power::PowerSaving::default();
    let mut position = 0.0;
    let mut last_status = Status::Starting;
    let mut next_check = Instant::now();
    let mut retry_at = Instant::now();
    let mut failures = 0u32;
    // Playback restarts since the video last played steadily, and when it last began to.
    let mut recoveries = 0u32;
    let mut healthy_since: Option<Instant> = None;

    loop {
        loop {
            match commands.try_recv() {
                Ok(Command::SetOptions { fit: next_fit, pause_on_battery: next_pause }) => {
                    fit = next_fit;
                    pause_on_battery = next_pause;
                }
                Ok(Command::Stop) | Err(TryRecvError::Disconnected) => return Ok(()),
                Err(TryRecvError::Empty) => break,
            }
        }

        if Instant::now() >= next_check {
            next_check = Instant::now() + CHECK_EVERY;
            let monitors = desktop_layer::monitors();
            let stale = screens.is_empty() || monitors != built_for
                || !screens.iter().all(|screen| screen.surface.is_alive());
            if stale && !monitors.is_empty() && Instant::now() >= retry_at {
                // Explorer restarted or the screens changed: carry on from the same place.
                if let Some(screen) = screens.first().filter(|screen| screen.player.is_loaded()) {
                    position = screen.player.position();
                }
                screens.clear();
                match build(&runtime, path, &monitors, position) {
                    Ok(next) => {
                        screens = next;
                        built_for = monitors;
                        failures = 0;
                    }
                    Err(message) => {
                        failures += 1;
                        if failures >= 15 {
                            return Err(message);
                        }
                        retry_at = Instant::now() + RETRY_AFTER;
                    }
                }
            }
            for screen in &screens {
                screen.surface.keep_order();
            }
            covered = win32::open_windows::covered_monitors();
            power = power::query_power_saving();
            // Remembered so a restart after an error carries on from here.
            if let Some(screen) = screens.first().filter(|screen| screen.player.is_loaded() && screen.resume_at == 0.0) {
                position = screen.player.position();
            }
        }

        // No cursor to read means the lock screen or another secure desktop is up.
        let locked = win32::window::cursor_position().is_none();
        if let Some(code) = screens.iter().find_map(|screen| screen.player.error_code()) {
            if !is_recoverable(code) || recoveries >= MAX_RECOVERIES {
                return Err(playback_error(code));
            }
            // Start again from the last known place, after a wait that grows each time.
            recoveries += 1;
            eprintln!("live wallpaper: playback error {code}, restart {recoveries} of {MAX_RECOVERIES}");
            screens.clear();
            retry_at = Instant::now() + recovery_delay(recoveries);
            next_check = Instant::now();
            healthy_since = None;
            report(Status::Starting);
            last_status = Status::Starting;
            desktop_layer::wait_and_pump(TICK_MS);
            continue;
        }

        let screen_on = display_state::display_is_on();
        let power_paused = paused_for_power(pause_on_battery, power.on_battery, power.battery_saver);
        let mut any_playing = false;
        let mut all_loaded = !screens.is_empty();
        for screen in &mut screens {
            if !screen.player.is_loaded() {
                all_loaded = false;
                continue;
            }
            if screen.resume_at > 0.0 {
                screen.player.seek(std::mem::take(&mut screen.resume_at));
            }
            if screen.laid_out != Some(fit) {
                if let Some(video) = screen.player.video_size() {
                    let size = (screen.monitor.right - screen.monitor.left, screen.monitor.bottom - screen.monitor.top);
                    screen.player.set_layout(source_rect(fit, video, size), size.0, size.1);
                    screen.laid_out = Some(fit);
                }
            }
            let play = !locked && screen_on && !power_paused && !covered.contains(&screen.monitor);
            screen.player.set_playing(play);
            any_playing |= play;
        }

        if all_loaded {
            let since = *healthy_since.get_or_insert_with(Instant::now);
            if recoveries > 0 && since.elapsed() >= STABLE_AFTER {
                recoveries = 0;
            }
        } else {
            healthy_since = None;
        }

        let status = match (all_loaded, any_playing) {
            (false, _) => Status::Starting,
            (true, true) => Status::Playing,
            (true, false) if power_paused => Status::PausedPower,
            (true, false) => Status::Paused,
        };
        if status != last_status {
            report(status.clone());
            last_status = status;
        }
        desktop_layer::wait_and_pump(TICK_MS);
    }
}
