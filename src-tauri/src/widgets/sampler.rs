//! One look at the desktop behind a widget, through Desktop Duplication (win32/desktop_duplication.rs).
//! The widget's own window is left out of the capture, so it never reads itself. Each look opens
//! the duplication, reads two regions and lets go again: it runs every few seconds at most, and
//! never holds one of the few duplications Windows allows per screen.

use windows::Win32::Foundation::HWND;

use super::backdrop::{analyze, Backdrop};
use crate::win32::{desktop_duplication::Duplication, window};

/// How many frames to wait for before giving up: the first one normally carries the whole desktop.
const ATTEMPTS: u32 = 6;
const FRAME_WAIT_MS: u32 = 100;

/// The backdrop of the window with this handle; `None` when there is nothing to read yet (the
/// window is gone or very small). An error means the desktop cannot be duplicated just now
/// (the lock screen, a rotated screen, too many duplications).
pub(super) fn sample(window_handle: isize) -> Result<Option<Backdrop>, String> {
    let handle = HWND(window_handle as *mut _);
    let Some(rect) = window::window_rect(handle) else { return Ok(None) };
    let region = (rect.left, rect.top, rect.right, rect.bottom);
    let centre = ((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    let mut duplication = Duplication::open(centre).map_err(|error| error.to_string())?;
    let mut behind = None;
    for _ in 0..ATTEMPTS {
        duplication.next_frame(FRAME_WAIT_MS, region).map_err(|error| error.to_string())?;
        behind = duplication.read_region(region).map_err(|error| error.to_string())?;
        if behind.is_some() {
            break;
        }
    }
    let Some(behind) = behind else { return Ok(None) };
    let monitor = duplication.monitor;
    let screen = duplication.read_region(monitor).map_err(|error| error.to_string())?;
    Ok(analyze(&behind.bgra, screen.as_ref().map_or(&[], |screen| screen.bgra.as_slice())))
}
