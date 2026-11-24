//! What happens to the PC's devices, for the island's pop-ups: Bluetooth devices connecting, and
//! more to come. The frontend polls these commands and announces what changed.

mod bluetooth;

use bluetooth::BluetoothDeviceInfo;

/// The Bluetooth devices (classic and low energy) that are connected right now, by name.
#[tauri::command]
pub async fn get_connected_bluetooth_devices() -> Result<Vec<BluetoothDeviceInfo>, String> {
    tauri::async_runtime::spawn_blocking(bluetooth::connected_devices)
        .await
        .map_err(|error| format!("Failed to join the Bluetooth task: {error}"))?
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::device_status::get_connected_bluetooth_devices,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
