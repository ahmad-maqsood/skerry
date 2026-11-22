//! Window enumeration and queries, cursor position, foreground switching,
//! interactivity checks and messages to other applications' windows.
#![allow(dead_code, reason = "Win32 helpers left over from removed features; prune when convenient")]

use windows::{core::BOOL, Win32::{Foundation::{HWND, POINT, RECT}, Graphics::{Dwm::{DwmSetWindowAttribute, DWMWA_TRANSITIONS_FORCEDISABLED, DWMWA_USE_IMMERSIVE_DARK_MODE}, Gdi::{GetMonitorInfoW, MonitorFromWindow, SetWindowRgn, MONITORINFO, MONITOR_DEFAULTTONEAREST}}, System::Threading::{AttachThreadInput, GetCurrentThreadId}, UI::{WindowsAndMessaging::{BringWindowToTop, IsGUIThread, GetClassNameW, GetCursorPos, GetForegroundWindow, GetWindowLongPtrW, GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindowVisible, SetForegroundWindow, ShowWindow, GWL_EXSTYLE, GWL_STYLE, SW_RESTORE}}}};

/// Class names are at most 256 UTF-16 units including the terminator.
const MAX_CLASS_NAME_UNITS: usize = 256;

/// Window class name of `window`; empty when the window is invalid.
pub(crate) fn class_name(window: HWND) -> String {
    let mut class = [0u16; MAX_CLASS_NAME_UNITS];
    // SAFETY: GetClassNameW writes at most `class.len()` units and returns how
    // many it wrote.
    let length = unsafe { GetClassNameW(window, &mut class) } as usize;
    String::from_utf16_lossy(&class[..length])
}

/// The window's style and extended style bits; zero for invalid windows.
pub(crate) fn styles(window: HWND) -> (u32, u32) {
    // SAFETY: GetWindowLongPtrW takes the HWND by value and returns 0 for invalid windows.
    unsafe {
        (
            GetWindowLongPtrW(window, GWL_STYLE) as u32,
            GetWindowLongPtrW(window, GWL_EXSTYLE) as u32,
        )
    }
}

pub(crate) fn is_visible(window: HWND) -> bool {
    // SAFETY: IsWindowVisible takes the HWND by value and returns false for
    // invalid windows.
    unsafe { IsWindowVisible(window) }.as_bool()
}

pub(crate) fn is_minimized(window: HWND) -> bool {
    // SAFETY: IsIconic takes the HWND by value and returns false for invalid
    // windows.
    unsafe { IsIconic(window) }.as_bool()
}

/// The current foreground window; a null HWND when there is none.
pub(crate) fn foreground_window() -> HWND {
    // SAFETY: GetForegroundWindow takes no arguments.
    unsafe { GetForegroundWindow() }
}

/// Screen rectangle of `window`; `None` when the window is invalid.
pub(crate) fn window_rect(window: HWND) -> Option<RECT> {
    let mut rect = RECT::default();
    // SAFETY: GetWindowRect fails for invalid HWND values and writes only into
    // the valid local `rect`.
    unsafe { GetWindowRect(window, &mut rect) }.ok()?;
    Some(rect)
}

/// Full rectangle of the monitor `window` is mostly on (taskbar included); `None`
/// when it cannot be read.
pub(crate) fn monitor_rect(window: HWND) -> Option<RECT> {
    let mut info = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    // SAFETY: MonitorFromWindow with DEFAULTTONEAREST always returns a monitor;
    // GetMonitorInfoW writes only into the local `info`, whose cbSize is set.
    unsafe {
        let monitor = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        GetMonitorInfoW(monitor, &mut info).as_bool().then_some(info.rcMonitor)
    }
}

/// Cursor position in screen coordinates; `None` when it cannot be read (for
/// example on the secure desktop).
pub(crate) fn cursor_position() -> Option<POINT> {
    let mut cursor = POINT::default();
    // SAFETY: GetCursorPos writes only into the valid local `cursor`.
    unsafe { GetCursorPos(&mut cursor) }.ok()?;
    Some(cursor)
}

/// Removes any window region so the whole window is drawn again. Returns whether
/// the call succeeded.
pub(crate) fn clear_window_region(window: HWND) -> bool {
    // SAFETY: passing no region transfers no ownership; SetWindowRgn fails for an
    // invalid HWND instead of touching memory.
    let result = unsafe { SetWindowRgn(window, None, true) };
    result != 0
}

/// Restores a minimized `window` to its previous size and position. Only for
/// ordinary windows such as editors and terminals; apps that hide their UI in
/// a webview should restore themselves.
pub(crate) fn restore_minimized(window: HWND) {
    if is_minimized(window) {
        // SAFETY: ShowWindow takes the HWND by value and fails for invalid
        // windows; its return value only reports the previous visibility.
        let _ = unsafe { ShowWindow(window, SW_RESTORE) };
    }
}

/// Brings `window`, owned by the calling thread, to the foreground while another
/// app holds it. Windows refuses SetForegroundWindow to a process that did not get
/// the last input; attaching to the foreground thread's input state lifts that
/// without synthesizing a key press (tao's fallback taps Alt, which leaves menu
/// bars armed in the app underneath). Returns whether `window` is now in front.
pub(crate) fn activate_from_background(window: HWND) -> bool {
    let foreground = foreground_window();
    if foreground == window {
        return true;
    }
    // SAFETY: both calls take only plain values; a null HWND yields thread id 0.
    let (foreground_thread, own_thread) =
        unsafe { (GetWindowThreadProcessId(foreground, None), GetCurrentThreadId()) };
    let attach = foreground_thread != 0 && foreground_thread != own_thread;
    // SAFETY: AttachThreadInput takes two thread ids and a flag; each attach is
    // undone below before returning, whatever SetForegroundWindow did.
    unsafe {
        let attached = attach && AttachThreadInput(own_thread, foreground_thread, true).as_bool();
        let _ = SetForegroundWindow(window);
        if attached {
            let _ = AttachThreadInput(own_thread, foreground_thread, false);
        }
    }
    foreground_window() == window
}

/// Whether `a` and `b` are mostly on the same monitor (each counted on the one it
/// overlaps most).
pub(crate) fn share_monitor(a: HWND, b: HWND) -> bool {
    // SAFETY: MonitorFromWindow takes the HWND by value; with DEFAULTTONEAREST it
    // returns a monitor even for invalid windows and never fails.
    unsafe { MonitorFromWindow(a, MONITOR_DEFAULTTONEAREST) == MonitorFromWindow(b, MONITOR_DEFAULTTONEAREST) }
}

/// Whether `window` is already in the foreground or was just brought there.
pub(crate) fn bring_to_foreground(window: HWND) -> bool {
    // SAFETY: GetForegroundWindow takes no arguments; SetForegroundWindow takes
    // the HWND by value and fails for invalid windows.
    unsafe { GetForegroundWindow() == window || SetForegroundWindow(window).as_bool() }
}

/// Brings another app's `window` to the front from any thread of this process. Plain
/// SetForegroundWindow is refused unless this process got the last input (the island may not
/// take the focus when clicked); attaching to the foreground thread's input lifts that, as in
/// `activate_from_background`. Returns whether `window` is now in front.
pub(crate) fn force_foreground(window: HWND) -> bool {
    restore_minimized(window);
    if bring_to_foreground(window) && foreground_window() == window {
        return true;
    }
    let foreground = foreground_window();
    // SAFETY: IsGUIThread(true) gives this (worker) thread the message queue AttachThreadInput
    // needs; the other calls take only plain values, and a null HWND yields thread id 0.
    let (foreground_thread, own_thread) = unsafe {
        let _ = IsGUIThread(true);
        (GetWindowThreadProcessId(foreground, None), GetCurrentThreadId())
    };
    let attach = foreground_thread != 0 && foreground_thread != own_thread;
    // SAFETY: AttachThreadInput takes two thread ids and a flag; the attach is undone below
    // whatever happened. BringWindowToTop and SetForegroundWindow take the HWND by value.
    unsafe {
        let attached = attach && AttachThreadInput(own_thread, foreground_thread, true).as_bool();
        let _ = BringWindowToTop(window);
        let _ = SetForegroundWindow(window);
        if attached {
            let _ = AttachThreadInput(own_thread, foreground_thread, false);
        }
    }
    foreground_window() == window
}

/// Turns off the animation Windows plays when `window` is shown or hidden, so it
/// appears in place at once. Returns whether DWM accepted it.
pub(crate) fn disable_show_animation(window: HWND) -> bool {
    let disabled = BOOL::from(true);
    // SAFETY: the attribute takes a BOOL; the pointer and size describe `disabled`,
    // which lives until the call returns. An invalid HWND only makes it fail.
    unsafe {
        DwmSetWindowAttribute(
            window,
            DWMWA_TRANSITIONS_FORCEDISABLED,
            (&disabled as *const BOOL).cast(),
            std::mem::size_of::<BOOL>() as u32,
        )
    }
    .is_ok()
}

/// Draws `window`'s title bar dark or light, whatever the Windows colour mode. Only DWM is asked,
/// so the window's theme (and with it the webviews' preferred colour scheme) stays as it is.
/// Returns whether DWM accepted it.
pub(crate) fn set_dark_title_bar(window: HWND, dark: bool) -> bool {
    let value = BOOL::from(dark);
    // SAFETY: the attribute takes a BOOL; the pointer and size describe `value`,
    // which lives until the call returns. An invalid HWND only makes it fail.
    unsafe {
        DwmSetWindowAttribute(
            window,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            (&value as *const BOOL).cast(),
            std::mem::size_of::<BOOL>() as u32,
        )
    }
    .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_windows_have_no_rect_and_no_effects() {
        assert_eq!(window_rect(HWND::default()).map(|_| ()), None);
        assert!(!clear_window_region(HWND::default()));
        assert_eq!(class_name(HWND::default()), "");
        assert!(!is_visible(HWND::default()));
        assert!(!disable_show_animation(HWND::default()));
    }
}
