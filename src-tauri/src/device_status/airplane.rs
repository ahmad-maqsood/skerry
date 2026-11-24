//! Airplane mode. Windows keeps it in `SystemRadioState` under `RadioManagement` (1 while on, 0
//! while off) and updates it whenever it is switched, from Quick Settings or a keyboard key.

use windows::Win32::System::Registry::HKEY_LOCAL_MACHINE;

use crate::win32::registry::read_dword;

const RADIO_MANAGEMENT_KEY: &str = r"SYSTEM\CurrentControlSet\Control\RadioManagement";
const AIRPLANE_VALUE: &str = "SystemRadioState";

/// Whether airplane mode is on, or `None` where Windows does not keep the setting (no radios).
pub(super) fn airplane_mode() -> Option<bool> {
    read_dword(HKEY_LOCAL_MACHINE, RADIO_MANAGEMENT_KEY, AIRPLANE_VALUE).map(is_on)
}

fn is_on(state: u32) -> bool {
    state != 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn any_non_zero_state_is_airplane_mode() {
        assert!(is_on(1));
        assert!(!is_on(0));
    }
}
