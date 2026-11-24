//! Connected Bluetooth devices, through the Windows Runtime device enumeration: one query for
//! classic devices (headphones, speakers) and one for low energy ones (most mice and keyboards).

use serde::Serialize;
use windows::{
    core::HSTRING,
    Devices::{
        Bluetooth::{BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice},
        Enumeration::DeviceInformation,
    },
};

use crate::win32;

/// A connected device. Mirrored by `BluetoothDeviceInfo` in `src/features/device-status/api.ts`.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BluetoothDeviceInfo {
    pub id: String,
    pub name: String,
}

/// The connected devices of one kind, as `(id, name)`; `selector` is that kind's device selector.
fn read_devices(selector: windows::core::Result<HSTRING>) -> Result<Vec<(String, String)>, String> {
    let selector = selector.map_err(|error| format!("Failed to build the Bluetooth query: {error}"))?;
    let operation = DeviceInformation::FindAllAsyncAqsFilter(&selector)
        .map_err(|error| format!("Failed to start reading Bluetooth devices: {error}"))?;
    let devices = pollster::block_on(operation)
        .map_err(|error| format!("Failed to read Bluetooth devices: {error}"))?;
    let mut found = Vec::new();
    for device in devices {
        let (Ok(id), Ok(name)) = (device.Id(), device.Name()) else {
            continue;
        };
        found.push((id.to_string(), name.to_string()));
    }
    Ok(found)
}

/// Every connected Bluetooth device. One kind failing (no low energy radio, say) does not hide the
/// other; an error comes back only when nothing could be read at all.
pub(super) fn connected_devices() -> Result<Vec<BluetoothDeviceInfo>, String> {
    let _apartment = win32::com::WinRtApartment::multithreaded()
        .map_err(|error| format!("Failed to initialize Windows Runtime apartment: {error}"))?;
    let mut found = Vec::new();
    let mut failure = None;
    for selector in [
        BluetoothDevice::GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus::Connected),
        BluetoothLEDevice::GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus::Connected),
    ] {
        match read_devices(selector) {
            Ok(devices) => found.extend(devices),
            Err(error) => failure = Some(error),
        }
    }
    match failure {
        Some(error) if found.is_empty() => Err(error),
        _ => Ok(unique_named(found)),
    }
}

/// The devices with a name, one per name (a device can show up as both classic and low energy),
/// in name order.
fn unique_named(devices: Vec<(String, String)>) -> Vec<BluetoothDeviceInfo> {
    let mut named: Vec<BluetoothDeviceInfo> = Vec::new();
    for (id, name) in devices {
        let name = name.trim();
        if name.is_empty() || named.iter().any(|device| device.name.eq_ignore_ascii_case(name)) {
            continue;
        }
        named.push(BluetoothDeviceInfo { id, name: name.to_string() });
    }
    named.sort_by_key(|device| device.name.to_lowercase());
    named
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pair(id: &str, name: &str) -> (String, String) {
        (id.to_string(), name.to_string())
    }

    #[test]
    fn devices_without_a_name_are_left_out() {
        assert!(unique_named(vec![pair("a", ""), pair("b", "   ")]).is_empty());
    }

    #[test]
    fn a_device_seen_twice_counts_once_and_names_are_trimmed() {
        let devices = unique_named(vec![pair("classic", " Buds "), pair("le", "buds")]);
        assert_eq!(devices, vec![BluetoothDeviceInfo { id: "classic".into(), name: "Buds".into() }]);
    }

    #[test]
    fn devices_come_back_in_name_order() {
        let names: Vec<String> = unique_named(vec![pair("1", "Mouse"), pair("2", "buds"), pair("3", "Keyboard")])
            .into_iter()
            .map(|device| device.name)
            .collect();
        assert_eq!(names, ["buds", "Keyboard", "Mouse"]);
    }
}
