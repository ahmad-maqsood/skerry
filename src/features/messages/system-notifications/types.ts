/**
 * Mirrors Rust `crate::system_notifications::NotificationStatus`
 * in `src-tauri/src/system_notifications/mod.rs`.
 */
export type NotificationStatus =
  | "disabled"
  | "waiting"
  | "listening"
  | "permissionDenied"
  | "permissionRequired"
  | "error";

/**
 * Mirrors Rust `crate::system_notifications::SystemNotification`
 * in `src-tauri/src/system_notifications/mod.rs`.
 */
export type SystemNotification = {
  id: string;
  appId: string;
  appDisplayName: string;
  title: string;
  body: string;
  bodyLines: string[];
  timestamp: number;
  appLogo?: string | null;
};

/**
 * Mirrors Rust `crate::system_notifications::KnownApp`
 * in `src-tauri/src/system_notifications/mod.rs`.
 */
export type KnownApp = {
  appId: string;
  appDisplayName: string;
  appLogo?: string | null;
};

/**
 * Mirrors Rust `crate::system_notifications::SystemNotificationSnapshot`
 * in `src-tauri/src/system_notifications/mod.rs`.
 */
export type SystemNotificationSnapshot = {
  revision: number;
  enabled: boolean;
  status: NotificationStatus;
  items: SystemNotification[];
  knownApps: KnownApp[];
  mutedApps: string[];
  hideText: boolean;
  error?: string | null;
};

/**
 * Mirrors Rust `crate::system_notifications::NotificationEvent`
 * in `src-tauri/src/system_notifications/mod.rs`.
 */
export type NotificationEvent = {
  snapshot: SystemNotificationSnapshot;
  newestId?: string | null;
  windowVisible: boolean;
};
