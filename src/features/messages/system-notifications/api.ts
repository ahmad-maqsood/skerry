import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import type { NotificationEvent, SystemNotificationSnapshot } from "./types";

/** Mirrors Rust `crate::system_notifications::EVENT_NAME`. */
export const SYSTEM_NOTIFICATIONS_CHANGED_EVENT = "system-notifications-changed";

export async function getSystemNotificationsState(): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("get_system_notifications_state");
}

export async function setSystemNotificationsEnabled(enabled: boolean): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("set_system_notifications_enabled", { enabled });
}

export async function requestSystemNotificationAccess(): Promise<string> {
  return invoke<string>("request_system_notification_access");
}

export async function openSystemNotificationSettings(access: boolean): Promise<void> {
  return invoke<void>("open_system_notification_settings", { access });
}

export async function clearSystemNotifications(): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("clear_system_notifications");
}

export async function dismissSystemNotification(id: string): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("dismiss_system_notification", { id });
}

export async function dismissSystemNotificationApp(appId: string): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("dismiss_system_notification_app", { appId });
}

export async function setAppMuted(appId: string, muted: boolean): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("set_app_muted", { appId, muted });
}

export async function setHideNotificationText(hide: boolean): Promise<SystemNotificationSnapshot> {
  return invoke<SystemNotificationSnapshot>("set_hide_notification_text", { hide });
}

export async function openNotificationApp(appId: string): Promise<void> {
  return invoke<void>("open_notification_app", { appId });
}

export async function listenSystemNotificationsChanged(
  handler: EventCallback<NotificationEvent>,
): Promise<UnlistenFn> {
  return listen<NotificationEvent>(SYSTEM_NOTIFICATIONS_CHANGED_EVENT, handler);
}
