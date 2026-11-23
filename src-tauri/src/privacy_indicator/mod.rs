//! Whether an app is using the microphone or camera right now, for the island's privacy dot.

use serde::Serialize;

use crate::win32::consent_store;

/// The consent store's names for the two devices.
const MICROPHONE: &str = "microphone";
const CAMERA: &str = "webcam";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacyStatus {
    pub microphone: bool,
    pub camera: bool,
}

fn read_status() -> PrivacyStatus {
    PrivacyStatus {
        microphone: consent_store::capability_in_use(MICROPHONE),
        camera: consent_store::capability_in_use(CAMERA),
    }
}

/// Reads the registry on a blocking thread: a few dozen small reads, but never on the IPC thread.
#[tauri::command]
pub async fn get_privacy_status() -> Result<PrivacyStatus, String> {
    tauri::async_runtime::spawn_blocking(read_status)
        .await
        .map_err(|error| format!("Failed to read the microphone and camera status: {error}"))
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::privacy_indicator::get_privacy_status,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_status_serializes_with_camel_case_names() {
        let status = PrivacyStatus {
            microphone: true,
            camera: false,
        };
        let json = serde_json::to_string(&status).unwrap_or_default();
        assert_eq!(json, r#"{"microphone":true,"camera":false}"#);
    }
}
