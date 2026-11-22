//! Unit tests for clipboard history persistence, recovery, pruning, and limits.

use super::*;
use std::fs;
use store::*;

#[test]
fn history_limit_keeps_default_and_accepts_one_thousand() {
    assert_eq!(ClipboardHistorySettings::default().max_items, 200);
    for (input, expected) in [(0, 5), (200, 200), (500, 500), (1000, 1000), (1500, 1000)] {
        let settings = ClipboardHistorySettings { max_items: input, ..Default::default() };
        assert_eq!(settings.normalized().max_items, expected);
    }
}

#[test]
fn file_items_load_as_text_with_their_paths_and_old_items_without_files() {
    let json = r#"{"settings":{"enabled":true,"captureImages":true,"maxItems":200},"items":[
        {"id":"1","kind":"text","hash":"h1","createdAt":1,"copiedAt":1,"preview":"a.txt","text":"C:/a.txt","image":null,"files":["C:/a.txt"]},
        {"id":"2","kind":"text","hash":"h2","createdAt":1,"copiedAt":1,"preview":"hi","text":"hi","image":null}]}"#;
    let dir = std::env::temp_dir().join(format!("skerry-clip-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join(HISTORY_FILE_NAME);
    fs::write(&path, json).unwrap();
    let (history, recovered) = load_history(&path);
    let _ = fs::remove_dir_all(&dir);
    assert!(!recovered);
    assert_eq!(history.items.len(), 2);
    assert_eq!(history.items[0].files.as_deref(), Some(&["C:/a.txt".to_string()][..]));
    assert!(history.items[1].files.is_none());
    let saved = serde_json::to_string(&history.items[1]).unwrap();
    assert!(!saved.contains("files"), "items without files keep the old shape");
}

#[test]
fn atomic_save_and_backup_recovery() {
    let dir = std::env::temp_dir().join(format!("skerry-clip-rec-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join(HISTORY_FILE_NAME);
    let bak_path = dir.join(BACKUP_FILE_NAME);

    let initial_history = PersistedClipboardHistory {
        settings: ClipboardHistorySettings::default(),
        items: vec![ClipboardHistoryItem {
            id: "item-1".to_string(),
            kind: ClipboardHistoryItemKind::Text,
            hash: "h1".to_string(),
            created_at: 100,
            copied_at: 100,
            favorite: false,
            note: String::new(),
            preview: "first".to_string(),
            text: Some("first".to_string()),
            image: None,
            files: None,
        }],
    };

    save_history_atomic(&path, &initial_history).unwrap();
    assert!(path.exists());

    let mut second_history = initial_history.clone();
    second_history.items.push(ClipboardHistoryItem {
        id: "item-2".to_string(),
        kind: ClipboardHistoryItemKind::Text,
        hash: "h2".to_string(),
        created_at: 200,
        copied_at: 200,
        favorite: true,
        note: String::new(),
        preview: "second".to_string(),
        text: Some("second".to_string()),
        image: None,
        files: None,
    });
    save_history_atomic(&path, &second_history).unwrap();
    assert!(bak_path.exists());

    // Corrupt main history file
    fs::write(&path, "{ corrupt json ...").unwrap();

    let (recovered_history, recovered) = load_history(&path);
    assert!(recovered);
    assert_eq!(recovered_history.items.len(), 1);
    assert_eq!(recovered_history.items[0].id, "item-1");

    let _ = fs::remove_dir_all(&dir);
}

#[test]
fn retention_prunes_expired_items_preserving_favorites() {
    let now = 1_000_000_000_000i64;
    let day_ms = 24 * 60 * 60 * 1000i64;

    let mut items = vec![
        ClipboardHistoryItem {
            id: "fresh".to_string(),
            kind: ClipboardHistoryItemKind::Text,
            hash: "h1".to_string(),
            created_at: now - 5 * day_ms,
            copied_at: now - 5 * day_ms,
            favorite: false,
            note: String::new(),
            preview: "fresh".to_string(),
            text: Some("fresh".to_string()),
            image: None,
            files: None,
        },
        ClipboardHistoryItem {
            id: "expired-regular".to_string(),
            kind: ClipboardHistoryItemKind::Text,
            hash: "h2".to_string(),
            created_at: now - 40 * day_ms,
            copied_at: now - 40 * day_ms,
            favorite: false,
            note: String::new(),
            preview: "expired".to_string(),
            text: Some("expired".to_string()),
            image: None,
            files: None,
        },
        ClipboardHistoryItem {
            id: "expired-favorite".to_string(),
            kind: ClipboardHistoryItemKind::Text,
            hash: "h3".to_string(),
            created_at: now - 100 * day_ms,
            copied_at: now - 100 * day_ms,
            favorite: true,
            note: String::new(),
            preview: "fav".to_string(),
            text: Some("fav".to_string()),
            image: None,
            files: None,
        },
    ];

    let removed = prune_expired_items(&mut items, 30, now);
    assert_eq!(removed.len(), 1);
    assert_eq!(removed[0].id, "expired-regular");
    assert_eq!(items.len(), 2);
    assert_eq!(items[0].id, "fresh");
    assert_eq!(items[1].id, "expired-favorite");
}

#[test]
fn image_cache_budget_evicts_oldest_non_favorite_originals() {
    let dir = std::env::temp_dir().join(format!("skerry-clip-img-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();

    let orig1 = dir.join("img1.png");
    let thumb1 = dir.join("img1-thumb.png");
    let orig2 = dir.join("img2.png");
    let thumb2 = dir.join("img2-thumb.png");

    let dummy_data = vec![0u8; 600 * 1024];
    let thumb_data = vec![0u8; 10 * 1024];

    fs::write(&orig1, &dummy_data).unwrap();
    fs::write(&thumb1, &thumb_data).unwrap();
    fs::write(&orig2, &dummy_data).unwrap();
    fs::write(&thumb2, &thumb_data).unwrap();

    let mut items = vec![
        ClipboardHistoryItem {
            id: "img-old".to_string(),
            kind: ClipboardHistoryItemKind::Image,
            hash: "h1".to_string(),
            created_at: 100,
            copied_at: 100,
            favorite: false,
            note: String::new(),
            preview: "old".to_string(),
            text: None,
            image: Some(ClipboardHistoryImage {
                width: 100,
                height: 100,
                byte_size: dummy_data.len() as u64,
                original_path: orig1.to_string_lossy().to_string(),
                thumbnail_path: thumb1.to_string_lossy().to_string(),
                thumbnail_data_url: None,
            }),
            files: None,
        },
        ClipboardHistoryItem {
            id: "img-new".to_string(),
            kind: ClipboardHistoryItemKind::Image,
            hash: "h2".to_string(),
            created_at: 200,
            copied_at: 200,
            favorite: false,
            note: String::new(),
            preview: "new".to_string(),
            text: None,
            image: Some(ClipboardHistoryImage {
                width: 100,
                height: 100,
                byte_size: dummy_data.len() as u64,
                original_path: orig2.to_string_lossy().to_string(),
                thumbnail_path: thumb2.to_string_lossy().to_string(),
                thumbnail_data_url: None,
            }),
            files: None,
        },
    ];

    enforce_image_cache_budget(&mut items, &dir, 1);

    assert!(!orig1.exists());
    assert!(thumb1.exists());
    assert!(orig2.exists());
    assert!(thumb2.exists());

    let _ = fs::remove_dir_all(&dir);
}
