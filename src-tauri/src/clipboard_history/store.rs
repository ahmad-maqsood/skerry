//! On-disk history: JSON file, atomic persistence, backup recovery, PNG images, and budget enforcement.

use image::{imageops::FilterType, DynamicImage, ImageFormat, RgbaImage};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs::{self, File},
    io::{Cursor, Write},
    path::Path,
};

use super::{ClipboardHistoryItem, ClipboardHistoryItemKind, ClipboardHistorySettings};

pub(super) const HISTORY_FILE_NAME: &str = "clipboard-history.json";
pub(super) const BACKUP_FILE_NAME: &str = "clipboard-history.json.bak";
pub(super) const TEMP_FILE_NAME: &str = "clipboard-history.json.tmp";

pub(super) const IMAGE_DIRECTORY_NAME: &str = "clipboard-images";

pub(super) const MAX_IMAGE_PNG_BYTES: usize = 10 * 1024 * 1024;

const THUMBNAIL_MAX_SIDE: u32 = 128;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PersistedClipboardHistory {
    pub(super) settings: ClipboardHistorySettings,
    pub(super) items: Vec<ClipboardHistoryItem>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardStorageSize {
    pub total_bytes: u64,
    pub history_file_bytes: u64,
    pub images_bytes: u64,
    pub items_count: usize,
    pub images_count: usize,
}

/// Loads the persisted history. If the main file is missing or corrupted,
/// attempts recovery from `clipboard-history.json.bak`. Returns the history
/// and a boolean indicating whether recovery from backup took place.
pub(super) fn load_history(history_path: &Path) -> (PersistedClipboardHistory, bool) {
    let backup_path = history_path.with_file_name(BACKUP_FILE_NAME);

    // 1. Try reading and parsing the main history file.
    if let Ok(content) = fs::read_to_string(history_path) {
        if let Ok(mut history) = serde_json::from_str::<PersistedClipboardHistory>(&content) {
            clean_history_items(&mut history);
            return (history, false);
        }
    }

    // 2. If main file failed (corrupt, partial write, or missing), try backup.
    if backup_path.exists() {
        if let Ok(backup_content) = fs::read_to_string(&backup_path) {
            if let Ok(mut backup_history) = serde_json::from_str::<PersistedClipboardHistory>(&backup_content) {
                clean_history_items(&mut backup_history);
                // Atomically restore backup over the corrupt history file
                let _ = save_history_atomic(history_path, &backup_history);
                return (backup_history, true);
            }
        }
    }

    (PersistedClipboardHistory::default(), false)
}

fn clean_history_items(history: &mut PersistedClipboardHistory) {
    history.settings = history.settings.clone().normalized();
    history.items.retain(|item| match item.kind {
        ClipboardHistoryItemKind::Text => {
            item.text.as_ref().is_some_and(|text| !text.is_empty())
        }
        ClipboardHistoryItemKind::Image => item.image.is_some(),
    });
}

/// Atomically persists history by writing to a temporary file, flushing buffers to physical
/// disk via `sync_all()`, creating/updating a `.bak` copy of the existing good file,
/// and atomically replacing the target history file.
pub(super) fn save_history_atomic(
    history_path: &Path,
    history: &PersistedClipboardHistory,
) -> Result<(), String> {
    let content = serde_json::to_string_pretty(history)
        .map_err(|error| format!("Failed to serialize clipboard history: {error}"))?;

    let temp_path = history_path.with_file_name(TEMP_FILE_NAME);
    let backup_path = history_path.with_file_name(BACKUP_FILE_NAME);

    // Write to .tmp and force flush to storage hardware
    let mut file = File::create(&temp_path)
        .map_err(|error| format!("Failed to create temporary clipboard history file: {error}"))?;
    file.write_all(content.as_bytes())
        .map_err(|error| format!("Failed to write temporary clipboard history: {error}"))?;
    file.sync_all()
        .map_err(|error| format!("Failed to sync temporary clipboard history to disk: {error}"))?;
    drop(file);

    // If current history file exists and is valid, back it up
    if history_path.exists() {
        let _ = fs::copy(history_path, &backup_path);
    }

    // Atomic rename over target
    fs::rename(&temp_path, history_path)
        .map_err(|error| format!("Failed to replace clipboard history file: {error}"))?;

    Ok(())
}

/// Prunes items older than `retention_days`. Favourites are never pruned.
/// If `retention_days == 0`, retention is indefinite (no items pruned).
/// Returns the list of pruned items so associated files can be removed.
pub(super) fn prune_expired_items(
    items: &mut Vec<ClipboardHistoryItem>,
    retention_days: u32,
    now_ms: i64,
) -> Vec<ClipboardHistoryItem> {
    if retention_days == 0 {
        return Vec::new();
    }

    let max_age_ms = (retention_days as i64) * 24 * 60 * 60 * 1000;
    let mut kept = Vec::with_capacity(items.len());
    let mut removed = Vec::new();

    for item in items.drain(..) {
        if item.favorite || (now_ms.saturating_sub(item.copied_at) <= max_age_ms) {
            kept.push(item);
        } else {
            removed.push(item);
        }
    }

    *items = kept;
    removed
}

/// Enforces the image cache budget in megabytes. If the total size of images in `image_dir`
/// exceeds `budget_mb`, evicts the full-size PNGs of the oldest non-favourite images while
/// preserving their 128 px thumbnails.
pub(super) fn enforce_image_cache_budget(
    items: &mut [ClipboardHistoryItem],
    image_dir: &Path,
    budget_mb: u32,
) {
    let budget_bytes = (budget_mb as u64) * 1024 * 1024;
    let mut total_image_bytes = calculate_image_dir_bytes(image_dir);

    if total_image_bytes <= budget_bytes {
        return;
    }

    // Collect non-favourite image indices sorted by copied_at ascending (oldest first)
    let mut non_fav_indices: Vec<usize> = items
        .iter()
        .enumerate()
        .filter_map(|(idx, item)| {
            if !item.favorite && item.kind == ClipboardHistoryItemKind::Image && item.image.is_some() {
                Some(idx)
            } else {
                None
            }
        })
        .collect();

    non_fav_indices.sort_by_key(|&idx| items[idx].copied_at);

    for idx in non_fav_indices {
        if total_image_bytes <= budget_bytes {
            break;
        }

        if let Some(image) = &items[idx].image {
            let original = Path::new(&image.original_path);
            let thumbnail = Path::new(&image.thumbnail_path);

            // Evict full-size PNG if distinct from thumbnail
            if original != thumbnail && original.exists() {
                if let Ok(metadata) = fs::metadata(original) {
                    let file_size = metadata.len();
                    if fs::remove_file(original).is_ok() {
                        total_image_bytes = total_image_bytes.saturating_sub(file_size);
                    }
                }
            }
        }
    }
}

/// Calculates storage metrics for history files and images on disk.
pub(super) fn calculate_storage_size(
    history_path: &Path,
    image_dir: &Path,
    items_count: usize,
) -> ClipboardStorageSize {
    let history_file_bytes = fs::metadata(history_path).map(|m| m.len()).unwrap_or(0);
    let backup_file_bytes = fs::metadata(history_path.with_file_name(BACKUP_FILE_NAME))
        .map(|m| m.len())
        .unwrap_or(0);
    let (images_bytes, images_count) = count_image_dir_metrics(image_dir);

    ClipboardStorageSize {
        total_bytes: history_file_bytes + backup_file_bytes + images_bytes,
        history_file_bytes: history_file_bytes + backup_file_bytes,
        images_bytes,
        items_count,
        images_count,
    }
}

fn calculate_image_dir_bytes(image_dir: &Path) -> u64 {
    let (bytes, _) = count_image_dir_metrics(image_dir);
    bytes
}

fn count_image_dir_metrics(image_dir: &Path) -> (u64, usize) {
    let mut total_bytes = 0u64;
    let mut count = 0usize;

    if let Ok(entries) = fs::read_dir(image_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total_bytes = total_bytes.saturating_add(metadata.len());
                    count += 1;
                }
            }
        }
    }

    (total_bytes, count)
}

pub(super) fn encode_png(image: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image.clone())
        .write_to(&mut bytes, ImageFormat::Png)
        .map_err(|error| format!("Failed to encode clipboard image: {error}"))?;
    Ok(bytes.into_inner())
}

pub(super) fn make_thumbnail(image: &RgbaImage) -> RgbaImage {
    let width = image.width().max(1);
    let height = image.height().max(1);
    let scale = (THUMBNAIL_MAX_SIDE as f32 / width.max(height) as f32).min(1.0);
    let thumbnail_width = ((width as f32 * scale).round() as u32).max(1);
    let thumbnail_height = ((height as f32 * scale).round() as u32).max(1);

    image::imageops::resize(
        image,
        thumbnail_width,
        thumbnail_height,
        FilterType::Lanczos3,
    )
}

pub(super) fn hash_bytes(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(super) fn preview_text(text: &str) -> String {
    const PREVIEW_LIMIT: usize = 140;
    let collapsed = text.split_whitespace().collect::<Vec<_>>().join(" ");

    if collapsed.chars().count() <= PREVIEW_LIMIT {
        return collapsed;
    }

    let mut preview = collapsed.chars().take(PREVIEW_LIMIT).collect::<String>();
    preview.push_str("...");
    preview
}

pub(super) fn create_item_id(timestamp: i64, hash: &str) -> String {
    let short_hash = hash.chars().take(12).collect::<String>();
    format!("{timestamp}-{short_hash}")
}
