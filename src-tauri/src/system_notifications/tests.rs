use super::*;
use super::history::NotificationBuffer;
use super::listener::is_own_app;

fn make_item(id: &str, app_id: &str, title: &str, body: &str, timestamp: i64) -> SystemNotification {
    SystemNotification {
        id: id.to_string(),
        app_id: app_id.to_string(),
        app_display_name: format!("{app_id} App"),
        title: title.to_string(),
        body: body.to_string(),
        body_lines: if body.is_empty() { vec![] } else { vec![body.to_string()] },
        timestamp,
        app_logo: None,
    }
}

#[test]
fn own_app_notifications_are_identified_and_ignored() {
    assert!(is_own_app("skerry", "skerry"));
    assert!(is_own_app("skerry.dev", "skerry"));
    assert!(is_own_app("skerry", "skerry"));
    assert!(is_own_app("SKERRY", "skerry"));
    assert!(is_own_app("some.skerry.app", "anything"));
    assert!(!is_own_app("Telegram.TelegramDesktop", "skerry"));
    assert!(!is_own_app("WhatsApp", "skerry"));
    assert!(!is_own_app("Microsoft.Outlook", "skerry"));
    assert!(!is_own_app("Chrome", "skerry"));
}

#[test]
fn notification_buffer_registers_known_apps() {
    let mut buffer = NotificationBuffer::default();
    let n1 = make_item("1", "WhatsApp", "Alice", "Hello", 1000);
    let n2 = make_item("2", "Telegram", "Bob", "Hi there", 2000);

    buffer.sync(vec![n1, n2], &[], false);

    assert_eq!(buffer.known_apps.len(), 2);
    assert!(buffer.known_apps.contains_key("WhatsApp"));
    assert!(buffer.known_apps.contains_key("Telegram"));
    assert_eq!(buffer.known_apps["WhatsApp"].app_display_name, "WhatsApp App");
}

#[test]
fn notification_buffer_deduplicates_repeats() {
    let mut buffer = NotificationBuffer::default();
    let n1 = make_item("1", "WhatsApp", "Alice", "Hello", 1000);
    let n2 = make_item("2", "Telegram", "Bob", "Hi there", 2000);

    // Initial baseline sync
    let newest = buffer.sync(vec![n1.clone(), n2.clone()], &[], false);
    assert!(newest.is_none(), "Initial baseline sets baseline without popping");
    assert_eq!(buffer.items.len(), 0);

    // Second sync with an identical list (no new arrivals)
    let newest = buffer.sync(vec![n1.clone(), n2.clone()], &[], false);
    assert!(newest.is_none());
    assert_eq!(buffer.items.len(), 0);

    // Arrival of a new notification n3
    let n3 = make_item("3", "WhatsApp", "Alice", "How are you?", 3000);
    let newest = buffer.sync(vec![n1.clone(), n2.clone(), n3.clone()], &[], false);
    assert_eq!(newest, Some("3".to_string()));
    assert_eq!(buffer.items.len(), 1);
    assert_eq!(buffer.items[0].id, "3");

    // Arrival with a repeat identical to n3 within 2 seconds
    let n3_repeat = make_item("3_dup", "WhatsApp", "Alice", "How are you?", 3500);
    let newest = buffer.sync(vec![n1.clone(), n2.clone(), n3.clone(), n3_repeat], &[], false);
    assert!(newest.is_none(), "Repeated identical notification within window is deduplicated");
    assert_eq!(buffer.items.len(), 1);
}

#[test]
fn per_app_mute_filters_out_muted_app_notifications() {
    let mut buffer = NotificationBuffer::default();
    let n1 = make_item("1", "WhatsApp", "Alice", "Hello", 1000);
    buffer.sync(vec![n1.clone()], &[], false);

    // Mute WhatsApp
    let muted = vec!["WhatsApp".to_string()];

    // A new WhatsApp notification arrives while muted
    let n2 = make_item("2", "WhatsApp", "Alice", "Muted message", 2000);
    let newest = buffer.sync(vec![n1.clone(), n2], &muted, false);
    assert_eq!(newest, None);
    assert_eq!(buffer.items.len(), 0);

    // An unmuted app notification arrives
    let n3 = make_item("3", "Outlook", "Boss", "Meeting at 3", 3000);
    let newest = buffer.sync(vec![n1.clone(), n3.clone()], &muted, false);
    assert_eq!(newest, Some("3".to_string()));
    assert_eq!(buffer.items.len(), 1);
    assert_eq!(buffer.items[0].app_id, "Outlook");
}

#[test]
fn hide_text_mode_clears_body_while_preserving_app_and_title() {
    let mut buffer = NotificationBuffer::default();
    let n1 = make_item("1", "Slack", "Colleague", "Private secret message", 1000);
    buffer.sync(vec![n1.clone()], &[], false);

    // New arrival with hide_text = true
    let n2 = make_item("2", "Slack", "Colleague", "Confidential text", 2000);
    let newest = buffer.sync(vec![n1, n2], &[], true);

    assert_eq!(newest, Some("2".to_string()));
    assert_eq!(buffer.items.len(), 1);
    let item = &buffer.items[0];
    assert_eq!(item.app_id, "Slack");
    assert_eq!(item.title, "Colleague");
    assert_eq!(item.body, "");
    assert!(item.body_lines.is_empty());
}

#[test]
fn notification_status_transitions_and_defaults() {
    let snapshot = SystemNotificationSnapshot::default();
    assert_eq!(snapshot.status, NotificationStatus::Disabled);
    assert!(!snapshot.enabled);
    assert_eq!(snapshot.revision, 0);
    assert!(snapshot.items.is_empty());
    assert!(snapshot.known_apps.is_empty());
    assert!(snapshot.muted_apps.is_empty());
    assert!(!snapshot.hide_text);
    assert!(snapshot.error.is_none());

    // Check all status variants exist and are distinct
    let statuses = [
        NotificationStatus::Disabled,
        NotificationStatus::Waiting,
        NotificationStatus::Listening,
        NotificationStatus::PermissionDenied,
        NotificationStatus::PermissionRequired,
        NotificationStatus::Error,
    ];
    for (i, a) in statuses.iter().enumerate() {
        for (j, b) in statuses.iter().enumerate() {
            if i == j {
                assert_eq!(a, b);
            } else {
                assert_ne!(a, b);
            }
        }
    }
}

#[test]
fn dismissing_items_and_apps_from_buffer() {
    let mut buffer = NotificationBuffer::default();
    let n1 = make_item("1", "AppA", "Title 1", "Body 1", 1000);
    let n2 = make_item("2", "AppA", "Title 2", "Body 2", 2000);
    let n3 = make_item("3", "AppB", "Title 3", "Body 3", 3000);

    buffer.sync(vec![], &[], false);
    buffer.sync(vec![n1, n2, n3], &[], false);
    assert_eq!(buffer.items.len(), 3);

    // Dismiss one item
    assert!(buffer.dismiss_item("2"));
    assert_eq!(buffer.items.len(), 2);
    assert!(!buffer.items.iter().any(|item| item.id == "2"));

    // Dismiss by app
    assert!(buffer.dismiss_app("AppA"));
    assert_eq!(buffer.items.len(), 1);
    assert_eq!(buffer.items[0].app_id, "AppB");

    // Clear all
    buffer.clear();
    assert_eq!(buffer.items.len(), 0);
}
