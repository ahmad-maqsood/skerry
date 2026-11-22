use std::time::Instant;
use sysinfo::{
    CpuRefreshKind, Disks, MemoryRefreshKind, Networks, ProcessRefreshKind,
    ProcessesToUpdate, RefreshKind, System,
};

use crate::win32::{power, wifi};
use super::models::{
    BatterySnapshot, CpuSnapshot, DiskDriveSnapshot, DiskSnapshot, MemorySnapshot,
    NetworkSnapshot, SystemSnapshot, WifiSnapshot,
};

/// Current battery and charger state; None on a PC without a battery or when it cannot be read.
/// Cheap enough to poll, unlike a full `SystemSampler::sample`.
pub fn battery_snapshot() -> Option<BatterySnapshot> {
    power::query_battery_status().map(|status| BatterySnapshot {
        has_battery: status.has_battery,
        is_charging: status.is_charging,
        is_plugged_in: status.is_plugged_in,
        percent: status.percent,
        remaining_seconds: status.remaining_seconds,
    })
}

pub struct SystemSampler {
    sys: System,
    disks: Disks,
    networks: Networks,
    last_sample_time: Instant,
}

impl SystemSampler {
    pub fn new() -> Self {
        let mut sys = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        sys.refresh_cpu_all();
        sys.refresh_memory();

        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();

        Self {
            sys,
            disks,
            networks,
            last_sample_time: Instant::now(),
        }
    }

    pub fn sample(&mut self) -> SystemSnapshot {
        let now = Instant::now();
        let elapsed_secs = now.duration_since(self.last_sample_time).as_secs_f64().max(0.1);
        self.last_sample_time = now;

        // 1. CPU
        self.sys.refresh_cpu_all();
        let total_percent = self.sys.global_cpu_usage();
        let core_percents: Vec<f32> = self.sys.cpus().iter().map(|c| c.cpu_usage()).collect();
        let core_count = core_percents.len();
        let cpu = CpuSnapshot {
            total_percent,
            core_count,
            core_percents,
        };

        // 2. Memory
        self.sys.refresh_memory();
        let total_bytes = self.sys.total_memory();
        let used_bytes = self.sys.used_memory();
        let percent = if total_bytes > 0 {
            (used_bytes as f64 / total_bytes as f64 * 100.0) as f32
        } else {
            0.0
        };
        let memory = MemorySnapshot {
            total_bytes,
            used_bytes,
            percent,
        };

        // 3. Disks
        self.disks.refresh(true);
        let mut drives = Vec::new();
        for disk in self.disks.list() {
            let total = disk.total_space();
            let available = disk.available_space();
            let used_percent = if total > 0 && total >= available {
                ((total - available) as f64 / total as f64 * 100.0) as f32
            } else {
                0.0
            };
            let mount = disk.mount_point().to_string_lossy().to_string();
            let raw_name = disk.name().to_string_lossy().to_string();
            let name = if raw_name.trim().is_empty() {
                mount.clone()
            } else {
                raw_name
            };

            drives.push(DiskDriveSnapshot {
                mount_point: mount,
                name,
                total_bytes: total,
                available_bytes: available,
                used_percent,
            });
        }

        // Live disk I/O throughput across processes
        self.sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_disk_usage(),
        );
        let mut disk_read_delta = 0u64;
        let mut disk_write_delta = 0u64;
        for process in self.sys.processes().values() {
            let usage = process.disk_usage();
            disk_read_delta = disk_read_delta.saturating_add(usage.read_bytes);
            disk_write_delta = disk_write_delta.saturating_add(usage.written_bytes);
        }
        let read_bytes_per_sec = (disk_read_delta as f64 / elapsed_secs) as u64;
        let write_bytes_per_sec = (disk_write_delta as f64 / elapsed_secs) as u64;
        let disk = DiskSnapshot {
            drives,
            read_bytes_per_sec,
            write_bytes_per_sec,
        };

        // 4. Network
        self.networks.refresh(true);
        let mut rx_delta = 0u64;
        let mut tx_delta = 0u64;
        let mut total_rx_bytes = 0u64;
        let mut total_tx_bytes = 0u64;
        let mut has_active_ethernet = false;

        for (name, data) in self.networks.iter() {
            let is_loopback = name.eq_ignore_ascii_case("lo")
                || name.to_lowercase().contains("loopback");
            if !is_loopback {
                rx_delta = rx_delta.saturating_add(data.received());
                tx_delta = tx_delta.saturating_add(data.transmitted());
                total_rx_bytes = total_rx_bytes.saturating_add(data.total_received());
                total_tx_bytes = total_tx_bytes.saturating_add(data.total_transmitted());

                let lower_name = name.to_lowercase();
                let is_eth = lower_name.contains("ethernet") || lower_name.contains("eth");
                if is_eth && (data.received() > 0 || data.transmitted() > 0 || data.total_received() > 0) {
                    has_active_ethernet = true;
                }
            }
        }
        let rx_bytes_per_sec = (rx_delta as f64 / elapsed_secs) as u64;
        let tx_bytes_per_sec = (tx_delta as f64 / elapsed_secs) as u64;
        let network = NetworkSnapshot {
            rx_bytes_per_sec,
            tx_bytes_per_sec,
            total_rx_bytes,
            total_tx_bytes,
        };

        // 5. Wi-Fi (with Ethernet fallback)
        let wifi = if let Some(wifi_status) = wifi::query_wifi_status() {
            WifiSnapshot {
                connected: true,
                // An empty name (details unreadable) shows as plain "Connected" in the panel.
                ssid: Some(wifi_status.ssid).filter(|name| !name.is_empty()),
                signal_percent: wifi_status.signal_percent,
                link_speed_mbps: wifi_status.link_speed_mbps,
                phy_type: Some(wifi_status.phy_type),
                is_ethernet_fallback: false,
            }
        } else if has_active_ethernet {
            WifiSnapshot {
                connected: true,
                ssid: Some("Ethernet".to_string()),
                signal_percent: 100,
                link_speed_mbps: 1000,
                phy_type: Some("Wired".to_string()),
                is_ethernet_fallback: true,
            }
        } else {
            WifiSnapshot {
                connected: false,
                ssid: None,
                signal_percent: 0,
                link_speed_mbps: 0,
                phy_type: None,
                is_ethernet_fallback: false,
            }
        };

        // 6. Battery
        let battery = battery_snapshot();

        // 7. Uptime
        let uptime_seconds = System::uptime();

        SystemSnapshot {
            cpu,
            memory,
            disk,
            network,
            wifi,
            battery,
            uptime_seconds,
        }
    }
}
