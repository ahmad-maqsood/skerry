//! Whether the screen is on, from Windows' display power notification. The notification arrives at
//! a hidden window, so the thread that creates a [`DisplayWatcher`] must keep pumping messages
//! (the live wallpaper thread does, through `desktop_layer::wait_and_pump`).

use std::sync::atomic::{AtomicBool, Ordering};

use windows::{
    core::GUID,
    Win32::{
        Foundation::{HANDLE, HINSTANCE, HWND, LPARAM, LRESULT, WPARAM},
        System::Power::{
            RegisterPowerSettingNotification, UnregisterPowerSettingNotification, HPOWERNOTIFY,
            POWERBROADCAST_SETTING,
        },
        UI::WindowsAndMessaging::{DEVICE_NOTIFY_WINDOW_HANDLE, PBT_POWERSETTINGCHANGE, WM_POWERBROADCAST},
    },
};

use super::message_window::{self, WindowMessages};

const CLASS_NAME: &str = "SkerryDisplayState";
/// GUID_CONSOLE_DISPLAY_STATE: data 0 is off, 1 on, 2 dimmed. Written out here so the crate does not
/// need the whole `Win32_System_SystemServices` feature for one constant.
const CONSOLE_DISPLAY_STATE: GUID = GUID::from_u128(0x6fe69556_704a_47a0_8f24_c28d936fda47);

static DISPLAY_ON: AtomicBool = AtomicBool::new(true);

/// False only while Windows has turned the screen off. A dimmed screen still shows the desktop.
pub(crate) fn display_is_on() -> bool {
    DISPLAY_ON.load(Ordering::Relaxed)
}

struct Notifications;

impl WindowMessages for Notifications {
    fn handle(_: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) -> Option<LRESULT> {
        if message != WM_POWERBROADCAST || wparam.0 as u32 != PBT_POWERSETTINGCHANGE {
            return None;
        }
        // SAFETY: for PBT_POWERSETTINGCHANGE the system passes a pointer to a POWERBROADCAST_SETTING
        // that stays valid for the duration of this call.
        let setting = unsafe { &*(lparam.0 as *const POWERBROADCAST_SETTING) };
        if setting.PowerSetting == CONSOLE_DISPLAY_STATE && setting.DataLength >= 1 {
            DISPLAY_ON.store(setting.Data[0] != 0, Ordering::Relaxed);
        }
        Some(LRESULT(1))
    }
}

/// Listens for the screen turning off and on while it exists.
pub(crate) struct DisplayWatcher {
    instance: HINSTANCE,
    window: HWND,
    registration: HPOWERNOTIFY,
}

impl DisplayWatcher {
    pub(crate) fn start() -> Result<Self, String> {
        DISPLAY_ON.store(true, Ordering::Relaxed);
        let instance = message_window::module_instance().map_err(|error| error.to_string())?;
        message_window::register_class::<Notifications>(instance, CLASS_NAME).map_err(|error| error.to_string())?;
        let window = match message_window::create_message_only_window(instance, CLASS_NAME, "Skerry Display State") {
            Ok(window) => window,
            Err(error) => {
                let _ = message_window::unregister_class(instance, CLASS_NAME);
                return Err(error.to_string());
            }
        };
        // SAFETY: `window` is a live window of this thread and the GUID constant outlives the call.
        let registration = unsafe {
            RegisterPowerSettingNotification(HANDLE(window.0), &CONSOLE_DISPLAY_STATE, DEVICE_NOTIFY_WINDOW_HANDLE)
        };
        match registration {
            Ok(registration) => Ok(Self { instance, window, registration }),
            Err(error) => {
                let _ = message_window::destroy_window(window);
                let _ = message_window::unregister_class(instance, CLASS_NAME);
                Err(error.to_string())
            }
        }
    }
}

impl Drop for DisplayWatcher {
    fn drop(&mut self) {
        // SAFETY: `registration` came from RegisterPowerSettingNotification and is released once, here.
        let _ = unsafe { UnregisterPowerSettingNotification(self.registration) };
        let _ = message_window::destroy_window(self.window);
        let _ = message_window::unregister_class(self.instance, CLASS_NAME);
        DISPLAY_ON.store(true, Ordering::Relaxed);
    }
}
