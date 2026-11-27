//! Launch at startup: the current user's Run key, or the manifest's startup task in the
//! Microsoft Store package (startup_task.rs).
//!
//! The Run value alone does not say whether Windows will start the app. Turning an entry off
//! in Task Manager (or Settings → Apps → Startup) keeps the value and writes a flag under
//! `Explorer\StartupApproved\Run`, so both are read, and turning the in-app switch on clears the
//! flag. Only that explicit switch clears it: the first-run default and the rewrite of old
//! values leave the user's choice in Windows alone.
//!
//! The Run value (its name is `Skerry`) starts the app with [`AUTOSTART_ARG`], so a
//! launch at sign-in can be told from one by hand. At sign-in the desktop, Explorer and every
//! other startup app compete for the machine, so the island then shows without taking the
//! focus and its background services that watch other apps wait a little and start
//! one after another ([`hold_after_autostart`]). Values written by older versions,
//! without the argument, are rewritten once in the background.
//!
//! The value is read and written through the registry API (win32/registry.rs).

use std::{
    sync::OnceLock,
    thread,
    time::{Duration, Instant},
};

use tauri::{AppHandle, Manager};
use windows::Win32::System::Registry::HKEY_CURRENT_USER;

use super::startup_task::{self, Change};
use crate::win32::registry;

/// The Run key under `HKEY_CURRENT_USER`.
pub(super) const STARTUP_REGISTRY_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
pub(super) const STARTUP_REGISTRY_VALUE: &str = "Skerry";
/// Where Task Manager records which Run entries it has turned off.
const STARTUP_APPROVED_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
/// Passed by the Run value; any other launch has no arguments.
const AUTOSTART_ARG: &str = "--autostart";

const FIRST_RUN_SENTINEL_FILE: &str = ".startup_configured";

static LAUNCHED_AT: OnceLock<Instant> = OnceLock::new();

/// Notes when the process started; called first thing in `run()`.
pub(crate) fn note_launch() {
    let _ = LAUNCHED_AT.set(Instant::now());
}

/// Started by the Run value at sign-in.
pub(crate) fn launched_at_startup() -> bool {
    static AT_STARTUP: OnceLock<bool> = OnceLock::new();
    *AT_STARTUP.get_or_init(|| std::env::args().skip(1).any(|arg| arg == AUTOSTART_ARG))
}

/// On a launch at sign-in, blocks the calling background thread until `delay` after the
/// process started; at once otherwise. Each service passes its own delay so they start in turn.
pub(crate) fn hold_after_autostart(delay: Duration) {
    if !launched_at_startup() {
        return;
    }
    let elapsed = LAUNCHED_AT.get_or_init(Instant::now).elapsed();
    if let Some(left) = delay.checked_sub(elapsed) {
        thread::sleep(left);
    }
}

/// On a new install, enables launch at startup by default while recording a sentinel so
/// explicit user changes to turn it off are respected across future launches and updates.
/// An entry already turned off in Windows stays off.
pub(crate) fn ensure_default_on_first_run(app: &AppHandle) {
    let Ok(app_dir) = app.path().app_data_dir() else {
        return;
    };
    let sentinel = app_dir.join(FIRST_RUN_SENTINEL_FILE);
    if sentinel.exists() {
        return;
    }

    let _ = std::fs::create_dir_all(&app_dir);
    let _ = std::fs::write(&sentinel, "1");

    let result = if startup_task::is_packaged() {
        startup_task::set_enabled(true).map(|_| ())
    } else if read_value().is_none() {
        write_run_value()
    } else {
        Ok(())
    };
    if let Err(error) = result {
        eprintln!("failed to set default launch at startup: {error}");
    }
}

fn startup_value() -> Result<String, String> {
    let current_exe = std::env::current_exe()
        .map_err(|error| format!("Failed to resolve current executable: {error}"))?;
    Ok(format!("\"{}\" {AUTOSTART_ARG}", current_exe.display()))
}

/// The Run value as it is now, `None` when there is none.
fn read_value() -> Option<String> {
    registry::read_string(HKEY_CURRENT_USER, STARTUP_REGISTRY_KEY, STARTUP_REGISTRY_VALUE)
}

fn write_run_value() -> Result<(), String> {
    registry::write_string(HKEY_CURRENT_USER, STARTUP_REGISTRY_KEY, STARTUP_REGISTRY_VALUE, &startup_value()?)
        .map_err(|error| format!("Failed to update startup registry: {error}"))
}

/// `StartupApproved` data is a status byte followed by the time it was turned off. An odd
/// status byte (usually 3) means off, an even one (usually 2) means on; no value means on.
fn turned_off_in_windows(approval: Option<&[u8]>) -> bool {
    approval
        .and_then(<[u8]>::first)
        .is_some_and(|status| status & 1 == 1)
}

/// Whether Windows will start the app at the next sign-in.
pub(crate) fn is_enabled() -> Result<bool, String> {
    if startup_task::is_packaged() {
        return startup_task::is_enabled();
    }
    let approval = registry::read_binary(HKEY_CURRENT_USER, STARTUP_APPROVED_KEY, STARTUP_REGISTRY_VALUE);
    Ok(read_value().is_some() && !turned_off_in_windows(approval.as_deref()))
}

/// Applies the user's choice. Turning it on also lifts a Task Manager block; the Store
/// package cannot lift one, which is reported as [`Change::Refused`].
pub(crate) fn apply(enabled: bool) -> Result<Change, String> {
    if startup_task::is_packaged() {
        return startup_task::set_enabled(enabled);
    }
    if enabled {
        write_run_value()?;
        registry::delete_value(HKEY_CURRENT_USER, STARTUP_APPROVED_KEY, STARTUP_REGISTRY_VALUE)
    } else {
        registry::delete_value(HKEY_CURRENT_USER, STARTUP_REGISTRY_KEY, STARTUP_REGISTRY_VALUE)
    }
    .map_err(|error| format!("Failed to update startup registry: {error}"))?;
    Ok(Change::Applied)
}

/// Brings older entries up to date in the background.
///
/// Run key: a value written before the argument existed is rewritten to the current form
/// (same name, same executable), a minute after start so it costs nothing at sign-in.
///
/// Store package: earlier versions wrote a Run value that Windows never reads from a package,
/// so a switch that showed "on" started nothing. Such a leftover moves to the startup task.
pub(crate) fn upgrade_legacy_value() {
    thread::spawn(|| {
        if startup_task::is_packaged() {
            if read_value().is_some() {
                if let Err(error) = migrate_packaged_value() {
                    eprintln!("failed to move the startup entry to the startup task: {error}");
                }
            }
            return;
        }
        thread::sleep(Duration::from_secs(60));
        if read_value().is_some_and(|value| !value.contains(AUTOSTART_ARG)) {
            if let Err(error) = write_run_value() {
                eprintln!("failed to update the startup entry: {error}");
            }
        }
    });
}

fn migrate_packaged_value() -> Result<(), String> {
    // A task the user turned off in Windows is refused here and stays off.
    startup_task::set_enabled(true)?;
    registry::delete_value(HKEY_CURRENT_USER, STARTUP_REGISTRY_KEY, STARTUP_REGISTRY_VALUE)
        .map_err(|error| format!("Failed to update startup registry: {error}"))
}

#[tauri::command]
pub async fn get_launch_at_startup() -> Result<bool, String> {
    is_enabled()
}

#[tauri::command]
pub async fn set_launch_at_startup(enabled: bool) -> Result<(), String> {
    match apply(enabled)? {
        Change::Applied => Ok(()),
        Change::Refused(reason) => Err(reason.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_an_odd_status_byte_counts_as_turned_off() {
        assert!(!turned_off_in_windows(None));
        assert!(!turned_off_in_windows(Some(&[])));
        assert!(!turned_off_in_windows(Some(&[2, 0, 0, 0])));
        assert!(!turned_off_in_windows(Some(&[6, 0, 0, 0])));
        assert!(turned_off_in_windows(Some(&[3, 0, 0, 0])));
        assert!(turned_off_in_windows(Some(&[7, 0, 0, 0])));
    }
}
