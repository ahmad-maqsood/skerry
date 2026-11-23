import { readJson, writeJson } from "../../lib/storage.ts";

export const PRIVACY_SETTINGS_KEY = "skerry-privacy-settings";

export type PrivacySettings = {
  /** Show the microphone and camera dot on the collapsed island. */
  enabled: boolean;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = { enabled: true };

export function normalizePrivacySettings(raw: unknown): PrivacySettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PRIVACY_SETTINGS };
  return { enabled: (raw as Record<string, unknown>).enabled !== false };
}

export function loadPrivacySettings(): PrivacySettings {
  return normalizePrivacySettings(readJson(PRIVACY_SETTINGS_KEY));
}

export function savePrivacySettings(settings: PrivacySettings): void {
  writeJson(PRIVACY_SETTINGS_KEY, normalizePrivacySettings(settings));
}
