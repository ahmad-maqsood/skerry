//! Clipboard change notifications (`WM_CLIPBOARDUPDATE`) and privacy markers.

use windows::{
    core::{w, Result},
    Win32::{
        Foundation::{HGLOBAL, HWND},
        System::{
            DataExchange::{
                AddClipboardFormatListener, CloseClipboard, GetClipboardData,
                IsClipboardFormatAvailable, OpenClipboard, RegisterClipboardFormatW,
                RemoveClipboardFormatListener,
            },
            Memory::{GlobalLock, GlobalUnlock},
        },
    },
};

/// Sends `WM_CLIPBOARDUPDATE` to `window` whenever the clipboard changes.
pub(crate) fn add_format_listener(window: HWND) -> Result<()> {
    // SAFETY: takes the HWND by value and fails for invalid windows.
    unsafe { AddClipboardFormatListener(window) }
}

pub(crate) fn remove_format_listener(window: HWND) -> Result<()> {
    // SAFETY: takes the HWND by value; fails harmlessly if not registered.
    unsafe { RemoveClipboardFormatListener(window) }
}

/// Evaluates privacy exclusion based on standard Windows clipboard formats:
/// 1. "ExcludeClipboardContentFromMonitorProcessing"
/// 2. "Clipboard Viewer Ignore"
/// 3. "CanIncludeInClipboardHistory" (where DWORD == 0 excludes from history)
#[cfg(test)]
pub(crate) fn evaluate_privacy_markers(
    exclude_present: bool,
    viewer_ignore_present: bool,
    can_include_value: Option<u32>,
) -> bool {
    if exclude_present || viewer_ignore_present {
        return true;
    }
    if let Some(val) = can_include_value {
        if val == 0 {
            return true;
        }
    }
    false
}

/// Checks whether the system clipboard currently contains privacy markers indicating
/// that monitoring tools or clipboard history managers must skip capturing.
pub(crate) fn is_clipboard_marked_private() -> bool {
    // SAFETY: RegisterClipboardFormatW safely registers or looks up format names.
    let exclude_format = unsafe { RegisterClipboardFormatW(w!("ExcludeClipboardContentFromMonitorProcessing")) };
    // SAFETY: IsClipboardFormatAvailable only reads the format registered above.
    let exclude_present = exclude_format != 0 && unsafe { IsClipboardFormatAvailable(exclude_format) }.is_ok();

    // SAFETY: RegisterClipboardFormatW safely registers or looks up format names.
    let viewer_ignore_format = unsafe { RegisterClipboardFormatW(w!("Clipboard Viewer Ignore")) };
    // SAFETY: IsClipboardFormatAvailable only reads the format registered above.
    let viewer_ignore_present = viewer_ignore_format != 0 && unsafe { IsClipboardFormatAvailable(viewer_ignore_format) }.is_ok();

    if exclude_present || viewer_ignore_present {
        return true;
    }

    // SAFETY: RegisterClipboardFormatW safely registers or looks up format names.
    let can_include_format = unsafe { RegisterClipboardFormatW(w!("CanIncludeInClipboardHistory")) };
    // SAFETY: IsClipboardFormatAvailable only reads the format registered above.
    let can_include_present = can_include_format != 0 && unsafe { IsClipboardFormatAvailable(can_include_format) }.is_ok();

    if can_include_present {
        // SAFETY: OpenClipboard opens the clipboard for inspection without associating a window.
        if unsafe { OpenClipboard(None) }.is_ok() {
            let mut can_include_val = None;
            // SAFETY: GetClipboardData returns the handle if the format is valid and present.
            if let Ok(handle) = unsafe { GetClipboardData(can_include_format) } {
                if !handle.is_invalid() {
                    let hglobal = HGLOBAL(handle.0 as *mut _);
                    // SAFETY: GlobalLock acquires a pointer to the memory block if valid.
                    let ptr = unsafe { GlobalLock(hglobal) };
                    if !ptr.is_null() {
                        // SAFETY: ptr is non-null and valid for reading a u32 (DWORD).
                        let dword = unsafe { std::ptr::read_unaligned(ptr as *const u32) };
                        // SAFETY: GlobalUnlock releases the HGLOBAL lock.
                        let _ = unsafe { GlobalUnlock(hglobal) };
                        can_include_val = Some(dword);
                    }
                }
            }
            // SAFETY: CloseClipboard closes the opened clipboard.
            let _ = unsafe { CloseClipboard() };
            if can_include_val == Some(0) {
                return true;
            }
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn privacy_evaluation_respects_exclude_format() {
        assert!(evaluate_privacy_markers(true, false, None));
        assert!(evaluate_privacy_markers(true, true, Some(1)));
    }

    #[test]
    fn privacy_evaluation_respects_viewer_ignore_format() {
        assert!(evaluate_privacy_markers(false, true, None));
        assert!(evaluate_privacy_markers(false, true, Some(1)));
    }

    #[test]
    fn privacy_evaluation_respects_can_include_in_clipboard_history() {
        // DWORD 0 means do NOT include
        assert!(evaluate_privacy_markers(false, false, Some(0)));
        // DWORD 1 (or non-zero) means it CAN be included
        assert!(!evaluate_privacy_markers(false, false, Some(1)));
        // None means standard capture permitted
        assert!(!evaluate_privacy_markers(false, false, None));
    }
}
