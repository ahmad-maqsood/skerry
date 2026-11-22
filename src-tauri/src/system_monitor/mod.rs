//! Live PC health monitor: CPU, memory, disk, network throughput, Wi-Fi and power status.

pub mod models;
pub mod sampler;
pub mod service;

use tauri::AppHandle;
use models::{BatterySnapshot, SystemSnapshot};

#[tauri::command]
pub async fn get_system_snapshot() -> Result<SystemSnapshot, String> {
    Ok(service::get_system_snapshot())
}

/// Battery and charger state alone, for the island's "charger plugged / unplugged" pop-up.
#[tauri::command]
pub async fn get_battery_status() -> Result<Option<BatterySnapshot>, String> {
    Ok(sampler::battery_snapshot())
}

#[tauri::command]
pub async fn start_system_sampling(app: AppHandle, interval_secs: Option<u64>) -> Result<(), String> {
    let interval = interval_secs.unwrap_or(2).clamp(1, 10);
    service::start_system_sampling(app, interval);
    Ok(())
}

#[tauri::command]
pub async fn stop_system_sampling() -> Result<(), String> {
    service::stop_system_sampling();
    Ok(())
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::system_monitor::get_system_snapshot,
            crate::system_monitor::get_battery_status,
            crate::system_monitor::start_system_sampling,
            crate::system_monitor::stop_system_sampling,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::models::*;

    #[test]
    fn test_system_snapshot_serialization() {
        let snapshot = SystemSnapshot {
            cpu: CpuSnapshot {
                total_percent: 15.5,
                core_count: 4,
                core_percents: vec![10.0, 20.0, 15.0, 17.0],
            },
            memory: MemorySnapshot {
                total_bytes: 16_000_000_000,
                used_bytes: 8_000_000_000,
                percent: 50.0,
            },
            disk: DiskSnapshot {
                drives: vec![DiskDriveSnapshot {
                    mount_point: "C:".to_string(),
                    name: "Windows".to_string(),
                    total_bytes: 500_000_000_000,
                    available_bytes: 250_000_000_000,
                    used_percent: 50.0,
                }],
                read_bytes_per_sec: 1024,
                write_bytes_per_sec: 2048,
            },
            network: NetworkSnapshot {
                rx_bytes_per_sec: 5000,
                tx_bytes_per_sec: 2000,
                total_rx_bytes: 100_000,
                total_tx_bytes: 50_000,
            },
            wifi: WifiSnapshot {
                connected: true,
                ssid: Some("TestNetwork".to_string()),
                signal_percent: 80,
                link_speed_mbps: 866,
                phy_type: Some("Wi-Fi 6 (802.11ax)".to_string()),
                is_ethernet_fallback: false,
            },
            battery: Some(BatterySnapshot {
                has_battery: true,
                is_charging: true,
                is_plugged_in: true,
                percent: 90,
                remaining_seconds: Some(3600),
            }),
            uptime_seconds: 7200,
        };

        let json = serde_json::to_string(&snapshot).expect("serialization must succeed");
        assert!(json.contains("\"totalPercent\":15.5"));
        assert!(json.contains("\"ssid\":\"TestNetwork\""));
        assert!(json.contains("\"uptimeSeconds\":7200"));
    }
}
