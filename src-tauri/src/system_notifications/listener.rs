//! WinRT UserNotificationListener: reads all system toast notifications across Windows.

use std::{
    sync::{mpsc, Arc},
    time::Duration,
};
use windows::UI::Notifications::{
    KnownNotificationBindings,
    Management::{UserNotificationListener, UserNotificationListenerAccessStatus},
    NotificationKinds, UserNotification,
};

use super::history::NotificationBuffer;
use super::logo::get_or_extract_app_logo;
use super::{publish, NotificationService, NotificationStatus, SystemNotification};
use crate::win32;

pub(super) fn monitor(service: Arc<NotificationService>, receiver: mpsc::Receiver<()>) {
    crate::system::startup::hold_after_autostart(Duration::from_secs(5));
    let _apartment = win32::com::WinRtApartment::multithreaded().ok();

    loop {
        let (enabled, generation, muted_apps, hide_text) = match service.state.lock() {
            Ok(state) => (
                state.snapshot.enabled,
                state.generation,
                state.snapshot.muted_apps.clone(),
                state.snapshot.hide_text,
            ),
            Err(_) => return,
        };

        if !enabled {
            if receiver.recv().is_err() {
                return;
            }
            continue;
        }

        let poll = read_notifications(&service.own_app_id);

        let change = {
            let Ok(mut state) = service.state.lock() else {
                return;
            };
            if state.generation != generation || !state.snapshot.enabled {
                continue;
            }
            let before = state.snapshot.clone();
            let newest = match poll {
                Ok((NotificationStatus::Listening, current)) => {
                    state.snapshot.status = NotificationStatus::Listening;
                    state.snapshot.error = None;
                    let newest = state.buffer.sync(current, &muted_apps, hide_text);
                    state.snapshot.items = state.buffer.items.clone();
                    state.snapshot.known_apps =
                        state.buffer.known_apps.values().cloned().collect();
                    newest
                }
                Ok((status, _)) => {
                    state.buffer = NotificationBuffer::default();
                    state.snapshot.items.clear();
                    state.snapshot.status = status;
                    state.snapshot.error = None;
                    None
                }
                Err(error) => {
                    state.snapshot.status = NotificationStatus::Error;
                    state.snapshot.error = Some(error);
                    None
                }
            };
            if state.snapshot != before {
                state.snapshot.revision += 1;
                Some((state.snapshot.clone(), newest))
            } else {
                None
            }
        };

        if let Some((snapshot, newest)) = change {
            let suppressed = win32::notification_state::fullscreen_signal()
                != win32::notification_state::FullscreenSignal::None;
            let newest_for_publish = if suppressed { None } else { newest };
            publish(&service, snapshot, newest_for_publish);
        }

        if receiver.recv_timeout(Duration::from_secs(1))
            == Err(mpsc::RecvTimeoutError::Disconnected)
        {
            return;
        }
    }
}

pub(super) fn read_notifications(
    own_app_id: &str,
) -> Result<(NotificationStatus, Vec<SystemNotification>), String> {
    let _apartment = win32::com::WinRtApartment::multithreaded()
        .map_err(|error| format!("Failed to initialize Windows Runtime apartment: {error}"))?;
    let listener = UserNotificationListener::Current()
        .map_err(|error| format!("Windows UserNotificationListener is not available: {error}"))?;
    let access = listener
        .GetAccessStatus()
        .map_err(|error| format!("Failed to query notification access: {error}"))?;

    if access != UserNotificationListenerAccessStatus::Allowed {
        return Ok((
            if access == UserNotificationListenerAccessStatus::Denied {
                NotificationStatus::PermissionDenied
            } else {
                NotificationStatus::PermissionRequired
            },
            Vec::new(),
        ));
    }

    let operation = listener
        .GetNotificationsAsync(NotificationKinds::Toast)
        .map_err(|error| format!("Failed to start reading Windows notifications: {error}"))?;
    let notifications = pollster::block_on(operation)
        .map_err(|error| format!("Failed to retrieve Windows notifications: {error}"))?;

    let mut items = Vec::new();
    for notification in notifications {
        if let Ok(Some(item)) = parse_user_notification(&notification, own_app_id) {
            items.push(item);
        }
    }
    Ok((NotificationStatus::Listening, items))
}

pub(super) fn parse_user_notification(
    notification: &UserNotification,
    own_app_id: &str,
) -> windows::core::Result<Option<SystemNotification>> {
    let app = notification.AppInfo()?;
    let app_id = app.AppUserModelId()?.to_string_lossy();
    let trimmed_app_id = app_id.trim();
    if trimmed_app_id.is_empty() {
        return Ok(None);
    }

    if is_own_app(trimmed_app_id, own_app_id) {
        return Ok(None);
    }

    let display_name = app
        .DisplayInfo()
        .and_then(|info| info.DisplayName())
        .ok()
        .map(|name| name.to_string_lossy())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| trimmed_app_id.to_string());

    let id = notification.Id()?;
    let ticks = notification.CreationTime()?.UniversalTime;

    let mut parts = Vec::new();
    if let Ok(elements) = notification
        .Notification()?
        .Visual()?
        .GetBinding(&KnownNotificationBindings::ToastGeneric()?)
        .and_then(|binding| binding.GetTextElements())
    {
        for element in elements {
            if let Ok(text) = element.Text() {
                let s = text.to_string_lossy();
                if !s.trim().is_empty() {
                    parts.push(s);
                }
            }
        }
    }

    if parts.is_empty() {
        return Ok(None);
    }

    let title = parts.first().cloned().unwrap_or_else(|| display_name.clone());
    let body_lines: Vec<String> = parts.into_iter().skip(1).collect();
    let body = body_lines.join("\n");

    let app_logo = get_or_extract_app_logo(&app, trimmed_app_id);

    Ok(Some(SystemNotification {
        id: format!("{trimmed_app_id}:{id}:{ticks}"),
        app_id: trimmed_app_id.to_string(),
        app_display_name: display_name,
        title: title.chars().take(150).collect(),
        body: body.chars().take(2000).collect(),
        body_lines,
        timestamp: ticks / 10_000 - 11_644_473_600_000,
        app_logo,
    }))
}

pub(crate) fn is_own_app(app_id: &str, own_app_id: &str) -> bool {
    let lower = app_id.to_lowercase();
    let own_lower = own_app_id.to_lowercase();
    (!own_lower.is_empty() && lower == own_lower)
        || lower.contains("skerry") || lower.contains("com.ahmad-maqsood.skerry")
}
