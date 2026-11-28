import { invoke } from "@tauri-apps/api/core";

/** A Bluetooth device that is connected now. Corresponds to BluetoothDeviceInfo in src-tauri/src/device_status/bluetooth.rs. */
export type BluetoothDeviceInfo = {
  id: string;
  name: string;
};

// get_connected_bluetooth_devices in src-tauri/src/device_status/mod.rs.
export function getConnectedBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
  return invoke<BluetoothDeviceInfo[]>("get_connected_bluetooth_devices");
}

// get_airplane_mode in src-tauri/src/device_status/mod.rs: null on a PC with no airplane mode setting.
export function getAirplaneMode(): Promise<boolean | null> {
  return invoke<boolean | null>("get_airplane_mode");
}

// get_caps_lock in src-tauri/src/device_status/mod.rs: whether Caps Lock is switched on.
export function getCapsLock(): Promise<boolean> {
  return invoke<boolean>("get_caps_lock");
}
