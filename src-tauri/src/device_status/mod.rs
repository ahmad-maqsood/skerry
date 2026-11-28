//! What happens to the PC's devices, for the island's pop-ups: Bluetooth devices connecting,
//! airplane mode switching and Caps Lock being switched on or off. The frontend polls these commands and announces what changed.

mod airplane;
mod bluetooth;

use bluetooth::BluetoothDeviceInfo;

/// The Bluetooth devices (classic and low energy) that are connected right now, by name.
#[tauri::command]
pub async fn get_connected_bluetooth_devices() -> Result<Vec<BluetoothDeviceInfo>, String> {
    tauri::async_runtime::spawn_blocking(bluetooth::connected_devices)
        .await
        .map_err(|error| format!("Failed to join the Bluetooth task: {error}"))?
}

/// Whether airplane mode is on; `None` on a PC that has no setting for it.
#[tauri::command]
pub async fn get_airplane_mode() -> Result<Option<bool>, String> {
    Ok(airplane::airplane_mode())
}

/// Whether Caps Lock is on right now (the keyboard light).
#[tauri::command]
pub async fn get_caps_lock() -> Result<bool, String> {
    Ok(crate::win32::input::is_caps_lock_on())
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::device_status::get_connected_bluetooth_devices,
            crate::device_status::get_airplane_mode,
            crate::device_status::get_caps_lock,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
