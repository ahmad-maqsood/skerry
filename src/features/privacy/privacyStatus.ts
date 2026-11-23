import type { PrivacyStatus } from "./api.ts";

export type PrivacyDevice = "microphone" | "camera";

export const NO_PRIVACY_ACTIVITY: PrivacyStatus = { microphone: false, camera: false };

export function samePrivacyStatus(a: PrivacyStatus, b: PrivacyStatus): boolean {
  return a.microphone === b.microphone && a.camera === b.camera;
}

/** The devices in use, microphone first. */
export function devicesInUse(status: PrivacyStatus): PrivacyDevice[] {
  const devices: PrivacyDevice[] = [];
  if (status.microphone) devices.push("microphone");
  if (status.camera) devices.push("camera");
  return devices;
}

/** Reads a reply from the native side defensively: anything but `true` counts as not in use. */
export function normalizePrivacyStatus(raw: unknown): PrivacyStatus {
  if (typeof raw !== "object" || raw === null) return NO_PRIVACY_ACTIVITY;
  const record = raw as Record<string, unknown>;
  return { microphone: record.microphone === true, camera: record.camera === true };
}
