//! Windows that sit on the desktop, over the static wallpaper and under the icons, for the live
//! wallpaper. Explorer has two layouts, both handled here:
//!
//! - Windows 11 24H2 and later ("raised desktop"): Progman has `WS_EX_NOREDIRECTIONBITMAP`, and
//!   the icon view (`SHELLDLL_DefView`) and the wallpaper's `WorkerW` are both its children. Our
//!   window is a layered child of Progman, between the two. Layered child windows need the
//!   Windows 8+ entry in the app manifest (windows-app-manifest.xml).
//! - Earlier: after message 0x052C, a top-level `WorkerW` follows the window that holds the icon
//!   view, and our window is its child.
//!
//! Each surface is a host window with a plain child that the video is drawn into: video swap
//! chains cannot present to a layered window itself.
//!
//! Windows belong to the thread that made them: create, use and drop a surface on one thread, and
//! keep that thread pumping messages ([`wait_and_pump`]). Their parent is Explorer's, so a stalled
//! pump can stall the desktop.

use std::{ffi::c_void, iter::once, marker::PhantomData};

use windows::{
    core::{BOOL, PCWSTR},
    Win32::{
        Foundation::{COLORREF, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM},
        Graphics::Gdi::{
            CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, EnumDisplayMonitors, FillRect,
            GetMonitorInfoW, GetObjectW, GetStockObject, MapWindowPoints, RedrawWindow, SelectObject,
            SetStretchBltMode, StretchBlt, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, BLACK_BRUSH,
            DIB_RGB_COLORS, HALFTONE, HBITMAP, HBRUSH, HDC, HGDIOBJ, HMONITOR, MONITORINFO,
            RDW_ALLCHILDREN, RDW_ERASE, RDW_INVALIDATE, RDW_UPDATENOW, SRCCOPY,
        },
        UI::WindowsAndMessaging::{
            CreateWindowExW, DispatchMessageW, EnumWindows, FindWindowExW, FindWindowW, GetClientRect,
            GetParent, GetWindow, GetWindowLongPtrW, IsWindow, MsgWaitForMultipleObjects, PeekMessageW, SendMessageTimeoutW,
            SetLayeredWindowAttributes, SetParent, SetWindowLongPtrW, SetWindowPos, TranslateMessage,
            GWLP_USERDATA, GWL_STYLE, GW_HWNDPREV, HWND_TOP, LWA_ALPHA, MSG, PM_REMOVE, QS_ALLINPUT, SMTO_NORMAL,
            SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, WINDOW_EX_STYLE, WM_ERASEBKGND, WS_CHILD,
            WS_CLIPCHILDREN, WS_DISABLED, WS_EX_LAYERED, WS_EX_NOACTIVATE,
            WS_EX_NOREDIRECTIONBITMAP, WS_EX_TOOLWINDOW, WS_POPUP, WS_VISIBLE,
        },
    },
};

use super::{message_window, video_player::Still, window};

const CLASS_NAME: &str = "SkerryLiveWallpaper";
/// Undocumented Progman message that creates the wallpaper's `WorkerW` layer.
const SPAWN_WORKER: u32 = 0x052C;

/// Windows with nothing of their own to draw. Their background is the picture kept in the window's
/// user data (see [`DesktopSurface::show_still`]) or, with none, black: either way a surface whose
/// video is closed shows that rather than whatever was under it.
struct Plain;
impl message_window::WindowMessages for Plain {
    fn handle(window: HWND, message: u32, wparam: WPARAM, _: LPARAM) -> Option<LRESULT> {
        if message != WM_ERASEBKGND {
            return None;
        }
        let mut area = RECT::default();
        let dc = HDC(wparam.0 as *mut _);
        // SAFETY: for WM_ERASEBKGND, `wparam` is the device context to paint, valid for this call;
        // `area` is a valid local and the stock black brush needs no cleanup.
        unsafe {
            GetClientRect(window, &mut area).ok()?;
            FillRect(dc, &area, HBRUSH(GetStockObject(BLACK_BRUSH).0));
        }
        let still = HBITMAP(unsafe { GetWindowLongPtrW(window, GWLP_USERDATA) } as *mut c_void);
        if !still.is_invalid() {
            draw_still(dc, still, &area);
        }
        Some(LRESULT(1))
    }
}

/// Stretches `still` over `area` of `dc`.
fn draw_still(dc: HDC, still: HBITMAP, area: &RECT) {
    let mut bitmap = BITMAP::default();
    // SAFETY: `still` is a bitmap owned by the window being painted (it is only deleted after the
    // window stops pointing at it, on this thread); `bitmap` is a valid local of the size given.
    // The memory device context only holds the bitmap for the copy, and is cleaned up after it.
    unsafe {
        let size = std::mem::size_of::<BITMAP>() as i32;
        if GetObjectW(HGDIOBJ(still.0), size, Some((&mut bitmap as *mut BITMAP).cast())) == 0 {
            return;
        }
        let source = CreateCompatibleDC(Some(dc));
        if source.is_invalid() {
            return;
        }
        let previous = SelectObject(source, HGDIOBJ(still.0));
        SetStretchBltMode(dc, HALFTONE);
        let _ = StretchBlt(dc, 0, 0, area.right, area.bottom, Some(source), 0, 0, bitmap.bmWidth,
            bitmap.bmHeight, SRCCOPY);
        SelectObject(source, previous);
        let _ = DeleteDC(source);
    }
}

/// A bitmap holding `still`, to be deleted by whoever ends up owning it.
fn bitmap_of(still: &Still) -> Option<HBITMAP> {
    let header = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: still.width,
        // Negative: the rows run from the top, as they were read.
        biHeight: -still.height,
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    let info = BITMAPINFO { bmiHeader: header, ..Default::default() };
    let mut bits: *mut c_void = std::ptr::null_mut();
    // SAFETY: `info` and `bits` are valid locals. A 32-bit bitmap of this size holds exactly
    // `still.bgra.len()` bytes, which is what is copied in (and the length is checked first).
    unsafe {
        let wanted = still.width.max(0) as usize * still.height.max(0) as usize * 4;
        if wanted == 0 || still.bgra.len() != wanted {
            return None;
        }
        let bitmap = CreateDIBSection(None, &info, DIB_RGB_COLORS, &mut bits, None, 0).ok()?;
        if bits.is_null() {
            let _ = DeleteObject(HGDIOBJ(bitmap.0));
            return None;
        }
        std::ptr::copy_nonoverlapping(still.bgra.as_ptr(), bits.cast::<u8>(), wanted);
        Some(bitmap)
    }
}

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(once(0)).collect()
}

fn find_child(parent: Option<HWND>, after: Option<HWND>, class: &str) -> Option<HWND> {
    let class = wide(class);
    // SAFETY: `class` is NUL-terminated and outlives the call; no title is passed.
    unsafe { FindWindowExW(parent, after, PCWSTR(class.as_ptr()), PCWSTR::null()) }.ok()
}

fn progman() -> Option<HWND> {
    let class = wide("Progman");
    // SAFETY: `class` is NUL-terminated and outlives the call; no title is passed.
    unsafe { FindWindowW(PCWSTR(class.as_ptr()), PCWSTR::null()) }.ok()
}

unsafe extern "system" fn find_classic_worker(top: HWND, found: LPARAM) -> BOOL {
    if find_child(Some(top), None, "SHELLDLL_DefView").is_some() {
        if let Some(worker) = find_child(None, Some(top), "WorkerW") {
            // SAFETY: `found` is the address of the local in `DesktopLayer::find`, which outlives
            // the EnumWindows call running this callback on the same thread.
            unsafe { *(found.0 as *mut Option<HWND>) = Some(worker) };
            return BOOL::from(false);
        }
    }
    BOOL::from(true)
}

/// Where wallpaper windows go in the running Explorer.
#[derive(Clone, Copy)]
pub(crate) struct DesktopLayer {
    progman: HWND,
    parent: HWND,
    /// The icon view and the static wallpaper's window, in the raised desktop layout only.
    raised: Option<(HWND, Option<HWND>)>,
}

impl DesktopLayer {
    pub(crate) fn find() -> Result<Self, String> {
        let progman = progman().ok_or("The Windows desktop was not found (is Explorer running?).")?;
        // SAFETY: plain values only; the timeout keeps a hung Explorer from blocking this thread.
        unsafe {
            SendMessageTimeoutW(progman, SPAWN_WORKER, WPARAM(0xD), LPARAM(1), SMTO_NORMAL, 1000, None);
        }
        if window::styles(progman).1 & WS_EX_NOREDIRECTIONBITMAP.0 != 0 {
            let icons = find_child(Some(progman), None, "SHELLDLL_DefView")
                .ok_or("The desktop icon layer was not found.")?;
            let worker = find_child(Some(progman), None, "WorkerW");
            return Ok(Self { progman, parent: progman, raised: Some((icons, worker)) });
        }
        let mut worker: Option<HWND> = None;
        // SAFETY: the callback matches WNDENUMPROC and writes only through the pointer to
        // `worker`, alive for the whole call. Stopping early is reported as an error.
        let _ = unsafe {
            EnumWindows(Some(find_classic_worker), LPARAM((&mut worker as *mut Option<HWND>) as isize))
        };
        let parent = worker
            // Some builds keep the WorkerW inside Progman without the raised style.
            .or_else(|| find_child(Some(progman), None, "WorkerW"))
            .ok_or("Windows did not create a wallpaper layer on the desktop.")?;
        Ok(Self { progman, parent, raised: None })
    }
}

fn create(
    ex_style: WINDOW_EX_STYLE,
    style: windows::Win32::UI::WindowsAndMessaging::WINDOW_STYLE,
    parent: Option<HWND>,
    width: i32,
    height: i32,
) -> Result<HWND, String> {
    let instance = message_window::module_instance().map_err(|error| error.to_string())?;
    // Fails once the class exists; CreateWindowExW below reports a class that really is missing.
    let _ = message_window::register_class::<Plain>(instance, CLASS_NAME);
    let class = wide(CLASS_NAME);
    // SAFETY: `class` is NUL-terminated and outlives the call; no creation parameter is passed.
    unsafe {
        CreateWindowExW(ex_style, PCWSTR(class.as_ptr()), PCWSTR::null(), style, 0, 0, width, height,
            parent, None, Some(instance), None)
    }
    .map_err(|error| format!("Could not create the wallpaper window: {error}"))
}

/// One monitor's wallpaper window; destroyed when dropped. Not `Send`.
pub(crate) struct DesktopSurface {
    host: HWND,
    video: HWND,
    layer: DesktopLayer,
    _thread_bound: PhantomData<*const ()>,
}

impl DesktopSurface {
    /// A surface covering `monitor` (screen coordinates, physical pixels).
    pub(crate) fn new(layer: DesktopLayer, monitor: RECT) -> Result<Self, String> {
        let (width, height) = (monitor.right - monitor.left, monitor.bottom - monitor.top);
        let mut ex_style = WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW;
        if layer.raised.is_some() {
            ex_style |= WS_EX_LAYERED;
        }
        let host = create(ex_style, WS_POPUP | WS_CLIPCHILDREN | WS_DISABLED, None, width, height)?;
        // Owned from here on, so every early return destroys the window.
        let mut surface = Self { host, video: HWND::default(), layer, _thread_bound: PhantomData };
        let failed = |error: windows::core::Error| format!("Could not place the wallpaper on the desktop: {error}");
        // SAFETY: `host` is the window just created on this thread; all other arguments are plain
        // values or the valid local `corner`.
        unsafe {
            if layer.raised.is_some() {
                SetLayeredWindowAttributes(host, COLORREF(0), 255, LWA_ALPHA).map_err(failed)?;
            }
            SetWindowLongPtrW(host, GWL_STYLE, (WS_CHILD | WS_CLIPCHILDREN | WS_DISABLED).0 as isize);
            SetParent(host, Some(layer.parent)).map_err(failed)?;
            let mut corner = [POINT { x: monitor.left, y: monitor.top }];
            MapWindowPoints(None, Some(layer.parent), &mut corner);
            let after = layer.raised.map_or(HWND_TOP, |(icons, _)| icons);
            SetWindowPos(host, Some(after), corner[0].x, corner[0].y, width, height,
                SWP_NOACTIVATE | SWP_SHOWWINDOW).map_err(failed)?;
        }
        surface.video = create(WS_EX_NOACTIVATE, WS_CHILD | WS_VISIBLE | WS_DISABLED, Some(host), width, height)?;
        surface.keep_order();
        Ok(surface)
    }

    /// The window the video is drawn into.
    pub(crate) fn video_window(&self) -> isize {
        self.video.0 as isize
    }

    /// Repaints the video's window for after the player that drew into it was closed: with `still`
    /// (the player's last picture) when there is one, else black. Otherwise its last frame, or
    /// nothing, would be left there.
    pub(crate) fn show_still(&self, still: Option<&Still>) {
        self.drop_still();
        if let Some(bitmap) = still.and_then(bitmap_of) {
            // SAFETY: the window keeps the bitmap's handle until `drop_still` deletes it.
            unsafe { SetWindowLongPtrW(self.video, GWLP_USERDATA, bitmap.0 as isize) };
        }
        // SAFETY: repaints a window of this thread; fails harmlessly if it is gone.
        let _ = unsafe {
            RedrawWindow(Some(self.video), None, None, RDW_INVALIDATE | RDW_ERASE | RDW_UPDATENOW)
        };
    }

    /// Lets go of the picture to free its memory, without repainting: whatever is on screen stays
    /// until something draws over it (the video, once it plays).
    pub(crate) fn drop_still(&self) {
        // SAFETY: the window's user data is only ever set to a bitmap made by `bitmap_of`, which is
        // cleared before it is deleted; both calls fail harmlessly if the window is gone.
        unsafe {
            let held = SetWindowLongPtrW(self.video, GWLP_USERDATA, 0);
            if held != 0 {
                let _ = DeleteObject(HGDIOBJ(held as *mut c_void));
            }
        }
    }

    /// False once Explorer restarted or rebuilt the desktop; the surface must then be remade.
    pub(crate) fn is_alive(&self) -> bool {
        // SAFETY: both take the HWND by value and fail for windows that no longer exist.
        let placed = unsafe {
            IsWindow(Some(self.host)).as_bool()
                && GetParent(self.host).is_ok_and(|parent| parent == self.layer.parent)
        };
        placed && progman() == Some(self.layer.progman)
    }

    /// Keeps the static wallpaper's window under ours: Windows reorders them when the wallpaper or
    /// theme changes. Does nothing while the order is already right.
    pub(crate) fn keep_order(&self) {
        let Some((_, Some(worker))) = self.layer.raised else { return };
        let mut above = worker;
        // Walk up from the static wallpaper: finding our window there means it is above it.
        for _ in 0..64 {
            // SAFETY: GetWindow takes the HWND by value and fails at the top of the order.
            match unsafe { GetWindow(above, GW_HWNDPREV) } {
                Ok(previous) if previous == self.host => return,
                Ok(previous) => above = previous,
                Err(_) => break,
            }
        }
        // SAFETY: only the z-order changes; invalid windows make the call fail.
        let _ = unsafe {
            SetWindowPos(worker, Some(self.host), 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE)
        };
    }
}

impl Drop for DesktopSurface {
    fn drop(&mut self) {
        self.drop_still();
        // Destroying the host destroys the video child with it.
        let _ = message_window::destroy_window(self.host);
        // SAFETY: repaints Explorer's window so no stale frame stays; fails harmlessly if gone.
        let _ = unsafe {
            RedrawWindow(Some(self.layer.parent), None, None, RDW_INVALIDATE | RDW_ERASE | RDW_ALLCHILDREN)
        };
    }
}

unsafe extern "system" fn collect_monitor(monitor: HMONITOR, _: HDC, _: *mut RECT, list: LPARAM) -> BOOL {
    let mut info = MONITORINFO { cbSize: std::mem::size_of::<MONITORINFO>() as u32, ..Default::default() };
    // SAFETY: GetMonitorInfoW writes only into `info`, whose cbSize is set. `list` is the address
    // of the Vec in `monitors`, which outlives the enumeration running on this thread.
    unsafe {
        if GetMonitorInfoW(monitor, &mut info).as_bool() {
            (*(list.0 as *mut Vec<RECT>)).push(info.rcMonitor);
        }
    }
    BOOL::from(true)
}

/// Every monitor's full rectangle.
pub(crate) fn monitors() -> Vec<RECT> {
    let mut list: Vec<RECT> = Vec::new();
    // SAFETY: the callback matches MONITORENUMPROC and only writes through the pointer to `list`,
    // alive for the whole call.
    let _ = unsafe {
        EnumDisplayMonitors(None, None, Some(collect_monitor), LPARAM((&mut list as *mut Vec<RECT>) as isize))
    };
    list
}

/// Waits up to `milliseconds` or until a message arrives, then dispatches this thread's messages.
pub(crate) fn wait_and_pump(milliseconds: u32) {
    let mut message = MSG::default();
    // SAFETY: no handles are waited on; `message` is a valid local filled by PeekMessageW.
    unsafe {
        MsgWaitForMultipleObjects(None, false, milliseconds, QS_ALLINPUT);
        while PeekMessageW(&mut message, None, 0, 0, PM_REMOVE).as_bool() {
            let _ = TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }
}
