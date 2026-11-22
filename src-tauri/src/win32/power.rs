//! Safe wrapper for battery power status via Win32 GetSystemPowerStatus.

use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

/// System battery and AC line status.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct BatteryStatus {
    pub has_battery: bool,
    pub is_charging: bool,
    pub is_plugged_in: bool,
    pub percent: u8,
    pub remaining_seconds: Option<u32>,
}

/// Queries battery and power status. Returns None when no battery exists or when unreadable.
pub(crate) fn query_battery_status() -> Option<BatteryStatus> {
    let mut status = SYSTEM_POWER_STATUS::default();

    // SAFETY: GetSystemPowerStatus accepts a valid mutable pointer to a stack-allocated struct.
    let result = unsafe { GetSystemPowerStatus(&mut status) };
    if result.is_err() {
        return None;
    }

    // BatteryFlag bit 7 (128) means "No system battery", 255 indicates unknown
    if status.BatteryFlag == 128 || status.BatteryFlag == 255 {
        return None;
    }

    if status.BatteryLifePercent > 100 {
        return None;
    }

    let is_charging = (status.BatteryFlag & 8) != 0;
    let is_plugged_in = status.ACLineStatus == 1;
    let remaining_seconds = if status.BatteryLifeTime != u32::MAX && status.BatteryLifeTime > 0 {
        Some(status.BatteryLifeTime)
    } else {
        None
    };

    Some(BatteryStatus {
        has_battery: true,
        is_charging,
        is_plugged_in,
        percent: status.BatteryLifePercent,
        remaining_seconds,
    })
}
