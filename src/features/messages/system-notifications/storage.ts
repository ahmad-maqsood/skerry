import { readJson, readString, writeJson, writeString } from "../../../lib/storage";

export const SYSTEM_NOTIFICATIONS_ENABLED_KEY = "skerry-system-notifications-enabled";
export const MUTED_APPS_KEY = "skerry-muted-apps";
export const HIDE_NOTIFICATION_TEXT_KEY = "skerry-hide-notification-text";
export const NOTIFICATION_ACCESS_REQUESTED_KEY = "skerry-system-notification-access-requested";

export function isSystemNotificationsEnabled(): boolean {
  const stored = readString(SYSTEM_NOTIFICATIONS_ENABLED_KEY);
  if (stored === null) return true;
  return stored !== "false";
}

export function saveSystemNotificationsEnabled(enabled: boolean): void {
  writeString(SYSTEM_NOTIFICATIONS_ENABLED_KEY, String(enabled));
}

export function getMutedApps(): string[] {
  const stored = readJson(MUTED_APPS_KEY);
  if (Array.isArray(stored) && stored.every((item) => typeof item === "string")) {
    return stored;
  }
  return [];
}

export function saveMutedApps(mutedApps: string[]): void {
  writeJson(MUTED_APPS_KEY, mutedApps);
}

export function isHideNotificationText(): boolean {
  const stored = readString(HIDE_NOTIFICATION_TEXT_KEY);
  return stored === "true";
}

export function saveHideNotificationText(hide: boolean): void {
  writeString(HIDE_NOTIFICATION_TEXT_KEY, String(hide));
}

export function hasRequestedNotificationAccess(): boolean {
  return readString(NOTIFICATION_ACCESS_REQUESTED_KEY) === "true";
}

export function markNotificationAccessRequested(): void {
  writeString(NOTIFICATION_ACCESS_REQUESTED_KEY, "true");
}
