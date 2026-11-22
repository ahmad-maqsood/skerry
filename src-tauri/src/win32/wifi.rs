//! Safe wrapper around Windows Native Wifi (WLAN) API.

use std::ffi::c_void;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::NetworkManagement::WiFi::{
    wlan_intf_opcode_current_connection, WlanCloseHandle, WlanEnumInterfaces, WlanFreeMemory,
    WlanOpenHandle, WlanQueryInterface, WLAN_CONNECTION_ATTRIBUTES, WLAN_INTERFACE_INFO,
    WLAN_INTERFACE_INFO_LIST, WLAN_OPCODE_VALUE_TYPE,
};

/// Live status of the active Wi-Fi connection.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct WifiStatus {
    pub ssid: String,
    pub signal_percent: u32,
    pub link_speed_mbps: u32,
    pub phy_type: String,
}

struct WlanHandle(HANDLE);

impl Drop for WlanHandle {
    fn drop(&mut self) {
        if !self.0.is_invalid() {
            // SAFETY: self.0 was returned by a successful WlanOpenHandle call.
            unsafe {
                let _ = WlanCloseHandle(self.0, None);
            }
        }
    }
}

fn map_phy_type(dot11_phy_type: i32) -> String {
    match dot11_phy_type {
        1 | 5 => "Wi-Fi (802.11b)".to_string(),
        4 | 6 => "Wi-Fi (802.11a/g)".to_string(),
        7 => "Wi-Fi 4 (802.11n)".to_string(),
        8 => "Wi-Fi 5 (802.11ac)".to_string(),
        9 => "Wi-Fi 6 (802.11ax)".to_string(),
        10 => "Wi-Fi 7 (802.11be)".to_string(),
        _ => "Wi-Fi".to_string(),
    }
}

/// Queries the primary active Wi-Fi connection if available.
pub(crate) fn query_wifi_status() -> Option<WifiStatus> {
    let mut negotiated_version = 0u32;
    let mut raw_handle = HANDLE::default();

    // SAFETY: WlanOpenHandle initializes a WLAN client session handle.
    let open_status = unsafe {
        WlanOpenHandle(
            2,
            None,
            &mut negotiated_version,
            &mut raw_handle,
        )
    };
    if open_status != 0 {
        return None;
    }
    let handle = WlanHandle(raw_handle);

    let mut raw_interface_list: *mut WLAN_INTERFACE_INFO_LIST = std::ptr::null_mut();
    // SAFETY: handle.0 is open and raw_interface_list receives an allocated interface list.
    let enum_status = unsafe {
        WlanEnumInterfaces(
            handle.0,
            None,
            &mut raw_interface_list,
        )
    };
    if enum_status != 0 || raw_interface_list.is_null() {
        return None;
    }

    // SAFETY: raw_interface_list points to a valid WLAN_INTERFACE_INFO_LIST structure.
    let item_count = unsafe { (*raw_interface_list).dwNumberOfItems as usize };
    if item_count == 0 {
        // SAFETY: Free the allocated interface list memory.
        unsafe {
            WlanFreeMemory(raw_interface_list as *const c_void);
        }
        return None;
    }

    // SAFETY: The array starts at InterfaceInfo and contains dwNumberOfItems entries.
    let interfaces: &[WLAN_INTERFACE_INFO] = unsafe {
        std::slice::from_raw_parts((*raw_interface_list).InterfaceInfo.as_ptr(), item_count)
    };

    let mut found_status: Option<WifiStatus> = None;

    for info in interfaces {
        let mut data_size = 0u32;
        let mut raw_data: *mut c_void = std::ptr::null_mut();
        let mut opcode_type = WLAN_OPCODE_VALUE_TYPE(0);

        // SAFETY: WlanQueryInterface retrieves the connection attributes for this GUID.
        let query_status = unsafe {
            WlanQueryInterface(
                handle.0,
                &info.InterfaceGuid,
                wlan_intf_opcode_current_connection,
                None,
                &mut data_size,
                &mut raw_data,
                Some(&mut opcode_type),
            )
        };

        if query_status == 0 && !raw_data.is_null() {
            // SAFETY: raw_data points to a valid WLAN_CONNECTION_ATTRIBUTES struct.
            let attributes = unsafe { &*(raw_data as *const WLAN_CONNECTION_ATTRIBUTES) };

            // 1 indicates wlan_interface_state_connected
            if attributes.isState.0 == 1 {
                let ssid_len = (attributes.wlanAssociationAttributes.dot11Ssid.uSSIDLength as usize).min(32);
                let ssid = String::from_utf8_lossy(
                    &attributes.wlanAssociationAttributes.dot11Ssid.ucSSID[..ssid_len],
                )
                .to_string();

                let signal_percent = attributes.wlanAssociationAttributes.wlanSignalQuality.min(100);
                let rx_rate = attributes.wlanAssociationAttributes.ulRxRate / 1000;
                let tx_rate = attributes.wlanAssociationAttributes.ulTxRate / 1000;
                let link_speed_mbps = rx_rate.max(tx_rate);
                let phy_type = map_phy_type(attributes.wlanAssociationAttributes.dot11PhyType.0);

                found_status = Some(WifiStatus {
                    ssid,
                    signal_percent,
                    link_speed_mbps,
                    phy_type,
                });
            }

            // SAFETY: Free the memory allocated by WlanQueryInterface.
            unsafe {
                WlanFreeMemory(raw_data);
            }

            if found_status.is_some() {
                break;
            }
        }
    }

    // SAFETY: Free the interface list allocated by WlanEnumInterfaces.
    unsafe {
        WlanFreeMemory(raw_interface_list as *const c_void);
    }

    found_status
}
