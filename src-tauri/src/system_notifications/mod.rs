//! Generic Windows system notifications: commands, snapshot types, and listener service.

pub(crate) mod history;
pub(crate) mod listener;
pub(crate) mod logo;

#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};
use std::{
    sync::{mpsc, Arc, Mutex, OnceLock},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use windows::UI::Notifications::Management::{
    UserNotificationListener, UserNotificationListenerAccessStatus,
};

use listener::monitor;
pub use history::NotificationBuffer;

pub const EVENT_NAME: &str = "system-notifications-changed";

static SERVICE: OnceLock<Arc<NotificationService>> = OnceLock::new();

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemNotification {
    pub id: String,
    pub app_id: String,
    pub app_display_name: String,
    pub title: String,
    pub body: String,
    pub body_lines: Vec<String>,
    pub timestamp: i64,
    pub app_logo: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnownApp {
    pub app_id: String,
    pub app_display_name: String,
    pub app_logo: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NotificationStatus {
    Disabled,
    Waiting,
    Listening,
    PermissionDenied,
    PermissionRequired,
    Error,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemNotificationSnapshot {
    pub revision: u64,
    pub enabled: bool,
    pub status: NotificationStatus,
    pub items: Vec<SystemNotification>,
    pub known_apps: Vec<KnownApp>,
    pub muted_apps: Vec<String>,
    pub hide_text: bool,
    pub error: Option<String>,
}

impl Default for SystemNotificationSnapshot {
    fn default() -> Self {
        Self {
            revision: 0,
            enabled: false,
            status: NotificationStatus::Disabled,
            items: Vec::new(),
            known_apps: Vec::new(),
            muted_apps: Vec::new(),
            hide_text: false,
            error: None,
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationEvent {
    pub snapshot: SystemNotificationSnapshot,
    pub newest_id: Option<String>,
    pub window_visible: bool,
}

#[derive(Default)]
pub struct MonitorState {
    pub snapshot: SystemNotificationSnapshot,
    pub generation: u64,
    pub buffer: NotificationBuffer,
}

pub struct NotificationService {
    pub app: AppHandle,
    pub own_app_id: String,
    pub state: Mutex<MonitorState>,
    pub wake: mpsc::SyncSender<()>,
}

pub fn init(app: &AppHandle) -> Result<(), String> {
    if SERVICE.get().is_some() {
        return Ok(());
    }
    let (wake, receiver) = mpsc::sync_channel(1);
    let own_app_id = app.config().identifier.clone();
    let service = Arc::new(NotificationService {
        app: app.clone(),
        own_app_id,
        state: Mutex::new(MonitorState::default()),
        wake,
    });
    SERVICE
        .set(service.clone())
        .map_err(|_| "System notification service is already initialized.".to_string())?;
    thread::Builder::new()
        .name("system-notifications".into())
        .spawn(move || monitor(service, receiver))
        .map_err(|error| format!("Failed to spawn system notification thread: {error}"))?;
    Ok(())
}

fn service() -> Result<&'static Arc<NotificationService>, String> {
    SERVICE
        .get()
        .ok_or_else(|| "System notification service is not ready.".to_string())
}

#[tauri::command]
pub fn get_system_notifications_state() -> Result<SystemNotificationSnapshot, String> {
    Ok(service()?
        .state
        .lock()
        .map_err(|_| "System notification state is unavailable.".to_string())?
        .snapshot
        .clone())
}

#[tauri::command]
pub fn set_system_notifications_enabled(
    enabled: bool,
) -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let snapshot = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        if state.snapshot.enabled == enabled {
            return Ok(state.snapshot.clone());
        }
        state.generation += 1;
        state.buffer = NotificationBuffer::default();
        state.snapshot = SystemNotificationSnapshot {
            revision: state.snapshot.revision + 1,
            enabled,
            status: if enabled {
                NotificationStatus::Waiting
            } else {
                NotificationStatus::Disabled
            },
            muted_apps: state.snapshot.muted_apps.clone(),
            hide_text: state.snapshot.hide_text,
            ..SystemNotificationSnapshot::default()
        };
        state.snapshot.clone()
    };
    publish(service, snapshot.clone(), None);
    let _ = service.wake.try_send(());
    Ok(snapshot)
}

#[tauri::command]
pub fn clear_system_notifications() -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let snapshot = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        state.buffer.clear();
        state.snapshot.items.clear();
        state.snapshot.revision += 1;
        state.snapshot.clone()
    };
    publish(service, snapshot.clone(), None);
    Ok(snapshot)
}

#[tauri::command]
pub fn dismiss_system_notification(id: String) -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let (snapshot, changed) = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        let changed = state.buffer.dismiss_item(&id);
        if changed {
            state.snapshot.items = state.buffer.items.clone();
            state.snapshot.revision += 1;
        }
        (state.snapshot.clone(), changed)
    };
    if changed {
        publish(service, snapshot.clone(), None);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn dismiss_system_notification_app(
    app_id: String,
) -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let (snapshot, changed) = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        let changed = state.buffer.dismiss_app(&app_id);
        if changed {
            state.snapshot.items = state.buffer.items.clone();
            state.snapshot.revision += 1;
        }
        (state.snapshot.clone(), changed)
    };
    if changed {
        publish(service, snapshot.clone(), None);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn set_app_muted(app_id: String, muted: bool) -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let snapshot = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        if muted {
            if !state
                .snapshot
                .muted_apps
                .iter()
                .any(|a| a.eq_ignore_ascii_case(&app_id))
            {
                state.snapshot.muted_apps.push(app_id.clone());
                state.buffer.dismiss_app(&app_id);
                state.snapshot.items = state.buffer.items.clone();
                state.snapshot.revision += 1;
            }
        } else {
            let before_len = state.snapshot.muted_apps.len();
            state
                .snapshot
                .muted_apps
                .retain(|a| !a.eq_ignore_ascii_case(&app_id));
            if state.snapshot.muted_apps.len() != before_len {
                state.snapshot.revision += 1;
            }
        }
        state.snapshot.clone()
    };
    publish(service, snapshot.clone(), None);
    Ok(snapshot)
}

#[tauri::command]
pub fn set_hide_notification_text(hide: bool) -> Result<SystemNotificationSnapshot, String> {
    let service = service()?;
    let snapshot = {
        let mut state = service
            .state
            .lock()
            .map_err(|_| "System notification state is unavailable.".to_string())?;
        if state.snapshot.hide_text != hide {
            state.snapshot.hide_text = hide;
            state.snapshot.revision += 1;
            if hide {
                for item in &mut state.snapshot.items {
                    item.body.clear();
                    item.body_lines.clear();
                }
            }
        }
        state.snapshot.clone()
    };
    publish(service, snapshot.clone(), None);
    Ok(snapshot)
}

#[tauri::command]
pub async fn request_system_notification_access(app: AppHandle) -> Result<String, String> {
    let (sender, receiver) = mpsc::sync_channel(1);
    app.run_on_main_thread(move || {
        let operation = (|| {
            let listener = UserNotificationListener::Current()?;
            let access = listener.GetAccessStatus()?;
            let operation = if access == UserNotificationListenerAccessStatus::Unspecified {
                Some(listener.RequestAccessAsync()?)
            } else {
                None
            };
            windows::core::Result::Ok((access, operation))
        })();
        let _ = sender.send(operation);
    })
    .map_err(|error| format!("Failed to initiate notification authorization: {error}"))?;
    let (access, operation) =
        tauri::async_runtime::spawn_blocking(move || receiver.recv_timeout(Duration::from_secs(5)))
            .await
            .map_err(|error| format!("Notification authorization thread failed: {error}"))?
            .map_err(|error| format!("Failed to request notification authorization: {error}"))?
            .map_err(|error| {
                format!("Failed to request Windows notification permissions: {error}")
            })?;
    let access = match operation {
        Some(operation) => operation
            .await
            .map_err(|error| format!("Windows notification authorization failed: {error}"))?,
        None => access,
    };
    let _ = service()?.wake.try_send(());
    Ok(match access {
        UserNotificationListenerAccessStatus::Allowed => "allowed",
        UserNotificationListenerAccessStatus::Denied => "denied",
        _ => "unspecified",
    }
    .to_string())
}

#[tauri::command]
pub fn open_system_notification_settings(app: AppHandle, access: bool) -> Result<(), String> {
    let url = if access {
        "ms-settings:privacy-notifications"
    } else {
        "ms-settings:notifications"
    };
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| format!("Failed to open Windows notification settings: {error}"))
}

#[tauri::command]
pub async fn open_notification_app(app_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let trimmed = app_id.trim();
        if trimmed.is_empty() {
            return Ok(());
        }
        let target = format!("shell:AppsFolder\\{trimmed}");
        let mut command = std::process::Command::new("explorer");
        command.arg(&target);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        let _ = command.spawn();
        Ok(())
    })
    .await
    .map_err(|error| format!("Failed to launch notification app: {error}"))?
}

pub fn publish(
    service: &NotificationService,
    snapshot: SystemNotificationSnapshot,
    newest_id: Option<String>,
) {
    let window_visible = service
        .app
        .get_webview_window("main")
        .is_some_and(|window| window.is_visible().unwrap_or(false));
    let event = NotificationEvent {
        snapshot,
        newest_id,
        window_visible,
    };
    let _ = service.app.emit_to(
        crate::settings_window::WINDOW_LABEL,
        EVENT_NAME,
        event.clone(),
    );
    let _ = service.app.emit_to("main", EVENT_NAME, event);
}

/// This module's Tauri commands.
macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::system_notifications::get_system_notifications_state,
            crate::system_notifications::set_system_notifications_enabled,
            crate::system_notifications::request_system_notification_access,
            crate::system_notifications::open_system_notification_settings,
            crate::system_notifications::clear_system_notifications,
            crate::system_notifications::dismiss_system_notification,
            crate::system_notifications::dismiss_system_notification_app,
            crate::system_notifications::set_app_muted,
            crate::system_notifications::set_hide_notification_text,
            crate::system_notifications::open_notification_app,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
