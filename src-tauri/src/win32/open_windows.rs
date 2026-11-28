//! Whether any app window is open on screen, for "Always display island on the desktop": the
//! island sits out while the desktop is clear and tucks once any window opens, however small.
//!
//! Only windows a person would call "open" count. Minimized and cloaked windows (a suspended
//! Store app, a window on another virtual desktop) are not on screen, and neither are the
//! shell's own windows, tool and overlay windows, or the windows of this app.

use windows::{
    core::BOOL,
    Win32::{
        Foundation::{HWND, LPARAM, RECT},
        Graphics::{
            Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED},
            Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTONULL},
        },
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindow, GW_OWNER, WS_EX_APPWINDOW, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
            WS_EX_TRANSPARENT,
        },
    },
};

use super::{process, window};

/// Windows that are part of the shell or its overlays rather than an app the person opened:
/// the desktop and the taskbars, the Start menu and search, the task view, the tray overflow.
const SHELL_CLASSES: [&str; 8] = [
    "Progman",
    "WorkerW",
    "Shell_TrayWnd",
    "Shell_SecondaryTrayWnd",
    "Windows.UI.Core.CoreWindow",
    "XamlExplorerHostIslandWindow",
    "MultitaskingViewFrame",
    "NotifyIconOverflowWindow",
];

/// What decides whether a top-level window counts as open.
pub(crate) struct WindowFacts<'a> {
    pub visible: bool,
    pub minimized: bool,
    /// Hidden by DWM: a suspended Store app, or a window on another virtual desktop.
    pub cloaked: bool,
    /// On at least one monitor (some apps keep a visible window parked off screen).
    pub on_screen: bool,
    /// Has an owner window; dialogs and tool palettes, which belong to a window that counts itself.
    pub owned: bool,
    /// One of this app's own windows (the island, settings, clipboard, translation).
    pub own: bool,
    pub ex_style: u32,
    pub class: &'a str,
    pub width: i32,
    pub height: i32,
}

/// Whether this window is an open app window. Pure, so the rules are tested without a desktop.
pub(crate) fn is_open_app_window(facts: &WindowFacts<'_>) -> bool {
    if !facts.visible || facts.minimized || facts.cloaked || !facts.on_screen || facts.owned || facts.own {
        return false;
    }
    if SHELL_CLASSES.contains(&facts.class) || facts.width < 2 || facts.height < 2 {
        return false;
    }
    // Tool windows stay out of the taskbar and Alt+Tab unless they ask to be in them; the
    // click-through and no-activate windows are overlays (recorders, game overlays, widgets).
    let tool = facts.ex_style & WS_EX_TOOLWINDOW.0 != 0 && facts.ex_style & WS_EX_APPWINDOW.0 == 0;
    let overlay = facts.ex_style & (WS_EX_NOACTIVATE.0 | WS_EX_TRANSPARENT.0) != 0;
    !tool && !overlay
}

fn is_cloaked(hwnd: HWND) -> bool {
    let mut cloaked = 0u32;
    // SAFETY: DWMWA_CLOAKED writes one DWORD; the pointer and size describe the valid local
    // `cloaked`. An invalid HWND only makes the call fail, which leaves it 0 (not cloaked).
    let _ = unsafe {
        DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            (&mut cloaked as *mut u32).cast(),
            std::mem::size_of::<u32>() as u32,
        )
    };
    cloaked != 0
}

fn facts_of<'a>(hwnd: HWND, class: &'a str) -> WindowFacts<'a> {
    let rect = window::window_rect(hwnd);
    // SAFETY: GetWindow takes the HWND by value; it fails (no owner) for windows without one.
    let owned = unsafe { GetWindow(hwnd, GW_OWNER) }.is_ok();
    // SAFETY: MonitorFromWindow takes the HWND by value; DEFAULTTONULL gives a null monitor
    // for a window on none instead of the nearest one.
    let on_screen = !unsafe { MonitorFromWindow(hwnd, MONITOR_DEFAULTTONULL) }.is_invalid();
    WindowFacts {
        visible: window::is_visible(hwnd),
        minimized: window::is_minimized(hwnd),
        cloaked: is_cloaked(hwnd),
        on_screen,
        owned,
        own: process::window_process_id(hwnd) == std::process::id(),
        ex_style: window::styles(hwnd).1,
        class,
        width: rect.map_or(0, |rect| rect.right - rect.left),
        height: rect.map_or(0, |rect| rect.bottom - rect.top),
    }
}

unsafe extern "system" fn check_window(hwnd: HWND, found: LPARAM) -> BOOL {
    // Cheap rejections first: most top-level windows are hidden helpers.
    if !window::is_visible(hwnd) || window::is_minimized(hwnd) {
        return BOOL::from(true);
    }
    let class = window::class_name(hwnd);
    if is_open_app_window(&facts_of(hwnd, &class)) {
        // SAFETY: `found` is the address of the `bool` on `any_open_app_window`'s stack, which
        // outlives the EnumWindows call that runs this callback on the same thread.
        unsafe { *(found.0 as *mut bool) = true };
        return BOOL::from(false);
    }
    BOOL::from(true)
}

/// Whether a window with these bounds hides the whole desktop of a monitor with this work area
/// (the monitor without the taskbar): maximized and full-screen windows do, smaller ones do not.
fn hides_desktop(window: RECT, work: RECT) -> bool {
    window.left <= work.left && window.top <= work.top && window.right >= work.right && window.bottom >= work.bottom
}

unsafe extern "system" fn collect_covered(hwnd: HWND, list: LPARAM) -> BOOL {
    if !window::is_visible(hwnd) || window::is_minimized(hwnd) {
        return BOOL::from(true);
    }
    let class = window::class_name(hwnd);
    if !is_open_app_window(&facts_of(hwnd, &class)) {
        return BOOL::from(true);
    }
    let mut info = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
    // SAFETY: DEFAULTTONEAREST always returns a monitor; GetMonitorInfoW writes only into `info`,
    // whose cbSize is set.
    let read = unsafe {
        GetMonitorInfoW(MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST), &mut info).as_bool()
    };
    if read && window::window_rect(hwnd).is_some_and(|rect| hides_desktop(rect, info.rcWork)) {
        // SAFETY: `list` is the address of the Vec on `covered_monitors`'s stack, which outlives
        // the EnumWindows call that runs this callback on the same thread.
        unsafe { (*(list.0 as *mut Vec<RECT>)).push(info.rcMonitor) };
    }
    BOOL::from(true)
}

/// The monitors (full rectangles) whose desktop an app window hides right now.
pub(crate) fn covered_monitors() -> Vec<RECT> {
    let mut covered: Vec<RECT> = Vec::new();
    // SAFETY: the callback matches WNDENUMPROC and only writes through the pointer to `covered`,
    // which stays alive for the whole call.
    let _ = unsafe { EnumWindows(Some(collect_covered), LPARAM((&mut covered as *mut Vec<RECT>) as isize)) };
    covered
}

/// Whether any app window is open on screen right now.
pub(crate) fn any_open_app_window() -> bool {
    let mut found = false;
    // SAFETY: the callback matches WNDENUMPROC and only writes through the pointer to the local
    // `found`, which stays alive for the whole call. EnumWindows reports a callback that stops
    // the walk early as an error, which is the expected way out here.
    let _ = unsafe { EnumWindows(Some(check_window), LPARAM((&mut found as *mut bool) as isize)) };
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    fn app_window() -> WindowFacts<'static> {
        WindowFacts {
            visible: true,
            minimized: false,
            cloaked: false,
            on_screen: true,
            owned: false,
            own: false,
            ex_style: WS_EX_APPWINDOW.0,
            class: "Notepad",
            width: 640,
            height: 480,
        }
    }

    #[test]
    fn only_maximized_and_full_screen_windows_hide_the_desktop() {
        let work = RECT { left: 0, top: 0, right: 1920, bottom: 1040 };
        let rect = |left, top, right, bottom| RECT { left, top, right, bottom };
        // Maximized windows hang a few pixels past the work area; full screen covers the taskbar.
        assert!(hides_desktop(rect(-8, -8, 1928, 1048), work));
        assert!(hides_desktop(rect(0, 0, 1920, 1080), work));
        assert!(!hides_desktop(rect(0, 0, 960, 1040), work));
        assert!(!hides_desktop(rect(100, 100, 1800, 900), work));
    }

    #[test]
    fn a_window_that_is_not_full_width_still_counts() {
        assert!(is_open_app_window(&app_window()));
        assert!(is_open_app_window(&WindowFacts { width: 120, height: 90, ex_style: 0, ..app_window() }));
    }

    #[test]
    fn windows_that_are_not_on_screen_do_not_count() {
        assert!(!is_open_app_window(&WindowFacts { visible: false, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { minimized: true, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { cloaked: true, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { on_screen: false, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { width: 0, height: 0, ..app_window() }));
    }

    #[test]
    fn the_shell_and_this_app_are_not_open_windows() {
        for class in SHELL_CLASSES {
            assert!(!is_open_app_window(&WindowFacts { class, ..app_window() }));
        }
        assert!(!is_open_app_window(&WindowFacts { own: true, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { owned: true, ..app_window() }));
    }

    #[test]
    fn tool_and_overlay_windows_do_not_count_unless_they_are_in_the_taskbar() {
        assert!(!is_open_app_window(&WindowFacts { ex_style: WS_EX_TOOLWINDOW.0, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { ex_style: WS_EX_NOACTIVATE.0, ..app_window() }));
        assert!(!is_open_app_window(&WindowFacts { ex_style: WS_EX_TRANSPARENT.0, ..app_window() }));
        assert!(is_open_app_window(&WindowFacts { ex_style: WS_EX_TOOLWINDOW.0 | WS_EX_APPWINDOW.0, ..app_window() }));
    }
}
