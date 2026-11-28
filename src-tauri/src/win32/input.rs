//! Keyboard and mouse button state queries, and synthesized key presses.
#![allow(dead_code, reason = "Win32 helpers left over from removed features; prune when convenient")]

use windows::Win32::{Foundation::{HWND, POINT}, UI::{Input::KeyboardAndMouse::{keybd_event, GetAsyncKeyState, GetKeyState, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CAPITAL, VK_CONTROL, VK_LBUTTON, VK_LWIN, VK_MENU, VK_RBUTTON, VK_RWIN, VK_SHIFT}, WindowsAndMessaging::{GetAncestor, WindowFromPoint, GA_ROOT}}};

use super::window;

pub(crate) fn click_block_reason(target: HWND, point: POINT) -> Option<&'static str> {
    if target.is_invalid() || window::foreground_window() != target {
        return Some("target is not foreground");
    }
    if is_any_button_down() {
        return Some("mouse button is held");
    }
    if [VK_CONTROL, VK_MENU, VK_SHIFT, VK_LWIN, VK_RWIN].into_iter().any(is_key_down) {
        return Some("modifier key is held");
    }
    // SAFETY: both queries accept values and can return a null HWND.
    if unsafe { GetAncestor(WindowFromPoint(point), GA_ROOT) != target } {
        return Some("point is covered by another window");
    }
    None
}

/// Whether the left mouse button is physically held right now.
pub(crate) fn is_left_button_down() -> bool {
    is_key_down(VK_LBUTTON)
}

/// Whether the left or right mouse button is physically held right now.
pub(crate) fn is_any_button_down() -> bool {
    is_key_down(VK_LBUTTON) || is_key_down(VK_RBUTTON)
}

/// Whether Alt, Ctrl or a Windows key is physically held: a keyboard shortcut such
/// as Alt+Tab may be in progress.
pub(crate) fn is_shortcut_modifier_down() -> bool {
    [VK_MENU, VK_CONTROL, VK_LWIN, VK_RWIN]
        .into_iter()
        .any(is_key_down)
}

/// Whether Caps Lock is switched on (the keyboard light), not whether the key is held.
pub(crate) fn is_caps_lock_on() -> bool {
    // SAFETY: GetKeyState only reads key state and accepts any key code. The low bit is the
    // toggle state of a toggle key such as Caps Lock.
    let state = unsafe { GetKeyState(i32::from(VK_CAPITAL.0)) };
    toggle_bit_set(state)
}

fn toggle_bit_set(state: i16) -> bool {
    state & 1 != 0
}

/// Synthesizes a key press for `key`, as if typed on the keyboard.
pub(crate) fn send_key_down(key: VIRTUAL_KEY) {
    send_key_event(key, KEYBD_EVENT_FLAGS(0));
}

/// Synthesizes a key release for `key`.
pub(crate) fn send_key_up(key: VIRTUAL_KEY) {
    send_key_event(key, KEYEVENTF_KEYUP);
}

fn send_key_event(key: VIRTUAL_KEY, flags: KEYBD_EVENT_FLAGS) {
    // SAFETY: keybd_event takes only plain values and inserts the event into the
    // input stream; it reads no caller memory. Virtual-key codes fit in a u8.
    unsafe { keybd_event(key.0 as u8, 0, flags, 0) };
}

fn is_key_down(key: VIRTUAL_KEY) -> bool {
    // SAFETY: GetAsyncKeyState only reads global key state and accepts any key code.
    // The high bit (negative value) means the key is currently down.
    let state = unsafe { GetAsyncKeyState(i32::from(key.0)) };
    state < 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_low_bit_means_a_toggle_key_is_on() {
        assert!(toggle_bit_set(1));
        // The high bit is "held down right now", which is not the same as switched on.
        assert!(!toggle_bit_set(i16::MIN));
        assert!(toggle_bit_set(i16::MIN | 1));
        assert!(!toggle_bit_set(0));
    }
}
