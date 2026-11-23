//! Screen brightness of a laptop's built-in display, through the Windows WMI brightness classes.
//!
//! The classes live in `root/WMI` and are answered by the panel driver, so only a laptop's own
//! screen has them: desktop PCs and external monitors report no brightness, and the island then
//! hides its slider. WMI is reached with one short hidden PowerShell call per read or change.

use std::{os::windows::process::CommandExt, process::Command};

use crate::system::CREATE_NO_WINDOW;

/// The lowest brightness the island sets: 0 turns some panels fully dark, with no way back by eye.
const MIN_PERCENT: u8 = 5;
const MAX_PERCENT: u8 = 100;

const READ_SCRIPT: &str = "(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness \
    -ErrorAction Stop | Select-Object -First 1).CurrentBrightness";

fn set_script(percent: u8) -> String {
    format!(
        "Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods \
         -ErrorAction Stop | Invoke-CimMethod -MethodName WmiSetBrightness \
         -Arguments @{{Timeout=1; Brightness={percent}}} | Out-Null"
    )
}

fn clamp_percent(percent: u8) -> u8 {
    percent.clamp(MIN_PERCENT, MAX_PERCENT)
}

/// The brightness a PowerShell read printed: a whole percentage from 0 to 100.
fn parse_brightness(output: &str) -> Option<u8> {
    output
        .trim()
        .parse::<u8>()
        .ok()
        .filter(|percent| *percent <= MAX_PERCENT)
}

/// Runs one PowerShell command without a console window and returns what it printed.
fn powershell(script: &str) -> Result<String, String> {
    let output = Command::new("powershell.exe")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|error| format!("Failed to run PowerShell: {error}"))?;
    if !output.status.success() {
        return Err("This display does not report or accept a brightness.".to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn read_brightness() -> Option<u8> {
    powershell(READ_SCRIPT)
        .ok()
        .and_then(|output| parse_brightness(&output))
}

/// The built-in display's brightness in percent, or `None` where the display does not report one.
#[tauri::command]
pub async fn get_brightness() -> Result<Option<u8>, String> {
    tauri::async_runtime::spawn_blocking(read_brightness)
        .await
        .map_err(|error| format!("Failed to join the brightness task: {error}"))
}

#[tauri::command]
pub async fn set_brightness(percent: u8) -> Result<(), String> {
    let percent = clamp_percent(percent);
    tauri::async_runtime::spawn_blocking(move || powershell(&set_script(percent)).map(|_| ()))
        .await
        .map_err(|error| format!("Failed to join the brightness task: {error}"))?
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::brightness::get_brightness,
            crate::brightness::set_brightness,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_read_is_a_whole_percentage() {
        assert_eq!(parse_brightness("70\r\n"), Some(70));
        assert_eq!(parse_brightness(" 0 "), Some(0));
        assert_eq!(parse_brightness("100"), Some(100));
        assert_eq!(parse_brightness("101"), None);
        assert_eq!(parse_brightness(""), None);
        assert_eq!(parse_brightness("bright"), None);
    }

    #[test]
    fn a_change_stays_between_the_lowest_and_full_brightness() {
        assert_eq!(clamp_percent(0), MIN_PERCENT);
        assert_eq!(clamp_percent(50), 50);
        assert_eq!(clamp_percent(255), MAX_PERCENT);
    }

    #[test]
    fn the_set_script_carries_the_percentage_and_nothing_else() {
        let script = set_script(42);
        assert!(script.contains("Brightness=42}"));
        assert!(script.contains("WmiSetBrightness"));
    }
}
