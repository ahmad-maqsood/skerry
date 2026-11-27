//! The `windows.startupTask` the Microsoft Store package declares (scripts/build-msix.ps1).
//! Windows redirects a package's Run key writes into a private hive that sign-in never
//! reads, so this task is the only thing that starts the Store build.

use std::thread;

use windows::{
    core::HSTRING,
    ApplicationModel::{Package, StartupTask, StartupTaskState},
};

use crate::win32::com::WinRtApartment;

/// Must match `TaskId` in the manifest written by scripts/build-msix.ps1.
const TASK_ID: &str = "SkerryStartup";

/// What became of a request to turn launch at startup on or off.
pub(crate) enum Change {
    Applied,
    /// Windows keeps its own setting; the text tells the user where to change it.
    Refused(&'static str),
}

/// Running from the Store package.
pub(crate) fn is_packaged() -> bool {
    Package::Current().is_ok()
}

pub(crate) fn is_enabled() -> Result<bool, String> {
    with_task(|task| Ok(is_on(task.State()?)))
}

pub(crate) fn set_enabled(enabled: bool) -> Result<Change, String> {
    with_task(move |task| {
        if enabled {
            // No prompt for a full-trust app. Returns the unchanged state when the user or a
            // policy has turned the task off.
            let state = task.RequestEnableAsync()?.get()?;
            Ok(if is_on(state) {
                Change::Applied
            } else if state == StartupTaskState::DisabledByPolicy {
                Change::Refused("Your organization has turned off launch at startup.")
            } else {
                Change::Refused("Windows has this turned off. Turn Skerry on in Task Manager, under Startup apps.")
            })
        } else {
            task.Disable()?;
            Ok(if is_on(task.State()?) {
                Change::Refused("Your organization keeps launch at startup turned on.")
            } else {
                Change::Applied
            })
        }
    })
}

fn is_on(state: StartupTaskState) -> bool {
    state == StartupTaskState::Enabled || state == StartupTaskState::EnabledByPolicy
}

/// Runs `action` on its own multithreaded-apartment thread, so that waiting for WinRT is
/// safe whichever thread asks.
fn with_task<T: Send + 'static>(
    action: impl FnOnce(&StartupTask) -> windows::core::Result<T> + Send + 'static,
) -> Result<T, String> {
    thread::spawn(move || {
        let _apartment = WinRtApartment::multithreaded()?;
        let task = StartupTask::GetAsync(&HSTRING::from(TASK_ID))?.get()?;
        action(&task)
    })
    .join()
    .map_err(|_| "The startup task thread stopped unexpectedly.".to_string())?
    .map_err(|error| format!("Failed to access the Windows startup task: {error}"))
}
