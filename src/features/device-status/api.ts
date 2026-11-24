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
