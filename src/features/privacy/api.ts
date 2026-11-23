import { invoke } from "@tauri-apps/api/core";

// Corresponds to PrivacyStatus in src-tauri/src/privacy_indicator/mod.rs.
export type PrivacyStatus = {
  microphone: boolean;
  camera: boolean;
};

export function getPrivacyStatus(): Promise<PrivacyStatus> {
  return invoke<PrivacyStatus>("get_privacy_status");
}
