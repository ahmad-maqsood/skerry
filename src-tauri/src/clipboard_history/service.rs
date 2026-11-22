//! History service, clipboard reads and writes, and the clipboard listener window.

use arboard::{Clipboard, ImageData};
use image::RgbaImage;
use std::{
    borrow::Cow,
    fs,
    sync::{
        mpsc::{self, SyncSender},
        Mutex, OnceLock,
    },
    thread,
    time::Duration,
};
use tauri::Emitter;
use windows::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    UI::WindowsAndMessaging::{WM_CLIPBOARDUPDATE, WM_ENDSESSION, WM_HOTKEY, WM_QUERYENDSESSION},
};

use super::hotkey::{
    refresh_registered_hotkey, request_hotkey_refresh, unregister_current_hotkey,
    CLIPBOARD_HOTKEY_WINDOW, HOTKEY_EVENT, HOTKEY_ID, HOTKEY_REFRESH_MESSAGE,
};
use super::store::{
    create_item_id, encode_png, hash_bytes, make_thumbnail, preview_text,
    PersistedClipboardHistory, MAX_IMAGE_PNG_BYTES,
};
use super::{
    current_unix_millis, service, ClipboardHistoryImage, ClipboardHistoryItem,
    ClipboardHistoryItemKind, ClipboardHistoryService, ClipboardHistorySettings,
    ClipboardHistorySnapshot, ClipboardHistoryState, HISTORY_CHANGED_EVENT,
    MAX_NOTE_CHARACTERS, SHORT_DUPLICATE_WINDOW_MS,
};
use crate::win32::{
    self,
    message_window::{self, WindowMessages},
};

const POLL_INTERVAL: Duration = Duration::from_secs(2);

const CLIPBOARD_WRITE_RETRY_ATTEMPTS: usize = 8;

const CLIPBOARD_WRITE_RETRY_DELAY: Duration = Duration::from_millis(35);

static CLIPBOARD_NOTIFY_TX: OnceLock<Mutex<Option<SyncSender<()>>>> = OnceLock::new();
static SAVE_NOTIFY_TX: OnceLock<SyncSender<()>> = OnceLock::new();

enum ClipboardCapture {
    Text {
        hash: String,
        text: String,
        preview: String,
    },
    Image {
        hash: String,
        width: usize,
        height: usize,
        rgba: Vec<u8>,
    },
    Files {
        hash: String,
        paths: Vec<String>,
    },
}

impl ClipboardHistoryService {
    pub(super) fn snapshot(&self) -> Result<ClipboardHistorySnapshot, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        Ok(Self::snapshot_locked(&state))
    }

    pub(super) fn set_settings(
        &self,
        settings: ClipboardHistorySettings,
    ) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        state.settings = settings.normalized();
        self.enforce_limit_locked(&mut state);
        self.persist_locked(&state)?;
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        request_hotkey_refresh();
        Ok(snapshot)
    }

    pub(super) fn copy_item(&self, id: &str) -> Result<ClipboardHistorySnapshot, String> {
        let item = {
            let state = self.state.lock().map_err(|error| error.to_string())?;
            state
                .items
                .iter()
                .find(|item| item.id == id)
                .cloned()
                .ok_or_else(|| "Clipboard history item was not found.".to_string())?
        };

        match item.kind {
            // Files still on disk go back as files; any that moved fall back to their paths.
            ClipboardHistoryItemKind::Text if item.files.as_ref().is_some_and(|files| {
                !files.is_empty() && files.iter().all(|path| std::path::Path::new(path).exists())
            }) => {
                write_clipboard_files(item.files.as_deref().unwrap_or_default())?;
            }
            ClipboardHistoryItemKind::Text => {
                let text = item
                    .text
                    .clone()
                    .ok_or_else(|| "Clipboard text item has no text.".to_string())?;
                write_clipboard_text(&text)?;
            }
            ClipboardHistoryItemKind::Image => {
                let image = item
                    .image
                    .as_ref()
                    .ok_or_else(|| "Clipboard image item has no image.".to_string())?;
                let rgba = image::open(&image.original_path)
                    .map_err(|error| format!("Failed to load clipboard image: {error}"))?
                    .to_rgba8();
                write_clipboard_image(rgba.width() as usize, rgba.height() as usize, &rgba)?;
            }
        }

        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        state.last_capture_hash = Some(item.hash.clone());
        if let Some(index) = state
            .items
            .iter()
            .position(|history_item| history_item.hash == item.hash)
        {
            let mut moved_item = state.items.remove(index);
            moved_item.copied_at = current_unix_millis();
            state.items.insert(0, moved_item);
            self.persist_locked(&state)?;
        }
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn toggle_favorite(&self, id: &str) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let item = state
            .items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or_else(|| "Clipboard history item was not found.".to_string())?;
        item.favorite = !item.favorite;
        self.persist_locked(&state)?;
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn set_note(
        &self,
        id: &str,
        note: &str,
    ) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let item = state
            .items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or_else(|| "Clipboard history item was not found.".to_string())?;
        item.note = note.trim().chars().take(MAX_NOTE_CHARACTERS).collect();
        self.persist_locked(&state)?;
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn delete_item(&self, id: &str) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        if let Some(index) = state.items.iter().position(|item| item.id == id) {
            let item = state.items.remove(index);
            self.remove_item_files(&item);
            self.persist_locked(&state)?;
        }
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn clear(&self) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        for item in state.items.iter().filter(|item| !item.favorite) {
            self.remove_item_files(item);
        }
        state.items.retain(|item| item.favorite);
        self.persist_locked(&state)?;
        let snapshot = Self::snapshot_locked(&state);
        drop(state);

        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn delete_items(&self, ids: &[String]) -> Result<ClipboardHistorySnapshot, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let original_order: Vec<String> = state.items.iter().map(|item| item.id.clone()).collect();
        let removed = super::selection::take_selected(&mut state.items, ids);
        if removed.is_empty() {
            return Ok(Self::snapshot_locked(&state));
        }
        if let Err(error) = self.persist_locked(&state) {
            state.items.extend(removed);
            state.items.sort_by_key(|item| original_order.iter().position(|id| id == &item.id));
            return Err(error);
        }
        for item in removed { self.remove_item_files(&item); }
        let snapshot = Self::snapshot_locked(&state);
        drop(state);
        self.emit_changed();
        Ok(snapshot)
    }

    pub(super) fn read_image(&self, id: &str) -> Result<String, String> {
        let (original_path, thumbnail_path) = self.image_field(id, |image| (image.original_path.clone(), image.thumbnail_path.clone()))?;
        let image_dir = self.image_dir();
        if let Ok(original) = super::image_access::managed_path(&image_dir, &original_path) {
            if original.exists() {
                return super::image_access::read_image(&image_dir, &original_path);
            }
        }
        super::image_access::read_image(&image_dir, &thumbnail_path)
    }

    pub(super) fn storage_size(&self) -> Result<super::store::ClipboardStorageSize, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        let history_path = self.history_path();
        let image_dir = self.image_dir();
        let count = state.items.len();
        drop(state);
        Ok(super::store::calculate_storage_size(&history_path, &image_dir, count))
    }

    pub(super) fn open_storage_folder(&self) -> Result<(), String> {
        let location = self.location.lock().map_err(|error| error.to_string())?;
        let dir = location
            .history_path
            .parent()
            .map(std::path::Path::to_path_buf)
            .ok_or_else(|| "The clipboard storage folder is unknown.".to_string())?;
        drop(location);
        tauri_plugin_opener::open_path(&dir, None::<&str>)
            .map_err(|error| format!("Failed to open clipboard storage folder: {error}"))
    }

    /// The list's thumbnail, read on demand; one older history kept inline is returned as is.
    pub(super) fn read_thumbnail(&self, id: &str) -> Result<String, String> {
        let (path, inline) = self.image_field(id, |image| (image.thumbnail_path.clone(), image.thumbnail_data_url.clone()))?;
        match inline {
            Some(data_url) => Ok(data_url),
            None => super::image_access::read_image(&self.image_dir(), &path),
        }
    }

    fn image_field<T>(&self, id: &str, field: impl FnOnce(&ClipboardHistoryImage) -> T) -> Result<T, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        state.items.iter().find(|item| item.id == id).and_then(|item| item.image.as_ref())
            .map(field)
            .ok_or_else(|| "Clipboard image was not found.".to_string())
    }

    pub(super) fn persist(&self) -> Result<(), String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        self.persist_locked(&state)
    }

    fn capture_current_clipboard(&self) {
        let settings = match self.state.lock() {
            Ok(state) => state.settings.clone(),
            Err(error) => {
                eprintln!("failed to lock clipboard history state: {error}");
                return;
            }
        };

        if !settings.enabled || settings.paused {
            return;
        }

        if win32::clipboard::is_clipboard_marked_private() {
            return;
        }

        let capture = match read_clipboard_capture(settings.capture_images) {
            Ok(Some(capture)) => capture,
            Ok(None) => return,
            Err(error) => {
                eprintln!("failed to read clipboard: {error}");
                return;
            }
        };

        if let Err(error) = self.insert_capture(capture) {
            eprintln!("failed to store clipboard history item: {error}");
        }
    }

    fn insert_capture(&self, capture: ClipboardCapture) -> Result<(), String> {
        let now = current_unix_millis();
        let hash = capture.hash().to_string();
        let mut state = self.state.lock().map_err(|error| error.to_string())?;

        if state.last_capture_hash.as_deref() == Some(hash.as_str()) {
            return Ok(());
        }
        state.last_capture_hash = Some(hash.clone());

        if let Some(first) = state.items.first() {
            if first.hash == hash
                && now.saturating_sub(first.copied_at) <= SHORT_DUPLICATE_WINDOW_MS
            {
                return Ok(());
            }
        }

        if let Some(index) = state.items.iter().position(|item| item.hash == hash) {
            let mut item = state.items.remove(index);
            item.copied_at = now;
            state.items.insert(0, item);
            state.dirty = true;
            drop(state);
            self.schedule_save();
            self.emit_changed();
            return Ok(());
        }

        let item = match capture {
            ClipboardCapture::Text {
                hash,
                text,
                preview,
            } => ClipboardHistoryItem {
                id: create_item_id(now, &hash),
                kind: ClipboardHistoryItemKind::Text,
                hash,
                created_at: now,
                copied_at: now,
                favorite: false,
                note: String::new(),
                preview,
                text: Some(text),
                image: None,
                files: None,
            },
            ClipboardCapture::Files { hash, paths } => ClipboardHistoryItem {
                id: create_item_id(now, &hash),
                kind: ClipboardHistoryItemKind::Text,
                hash,
                created_at: now,
                copied_at: now,
                favorite: false,
                note: String::new(),
                preview: files_preview(&paths),
                text: Some(paths.join("
")),
                image: None,
                files: Some(paths),
            },
            ClipboardCapture::Image {
                hash,
                width,
                height,
                rgba,
            } => {
                let image = self.persist_image(&hash, width, height, rgba)?;
                ClipboardHistoryItem {
                    id: create_item_id(now, &hash),
                    kind: ClipboardHistoryItemKind::Image,
                    hash,
                    created_at: now,
                    copied_at: now,
                    favorite: false,
                    note: String::new(),
                    preview: format!("{width} x {height} image"),
                    text: None,
                    image: Some(image),
                    files: None,
                }
            }
        };

        state.items.insert(0, item);
        self.enforce_limit_locked(&mut state);
        let retention_days = state.settings.retention_days;
        let expired = super::store::prune_expired_items(&mut state.items, retention_days, now);
        for expired_item in expired {
            self.remove_item_files(&expired_item);
        }
        let budget_mb = state.settings.image_cache_budget_mb;
        let image_dir = self.image_dir();
        super::store::enforce_image_cache_budget(&mut state.items, &image_dir, budget_mb);
        state.dirty = true;
        drop(state);

        self.schedule_save();
        self.emit_changed();
        Ok(())
    }

    fn persist_image(
        &self,
        hash: &str,
        width: usize,
        height: usize,
        rgba: Vec<u8>,
    ) -> Result<ClipboardHistoryImage, String> {
        let rgba_image = RgbaImage::from_raw(width as u32, height as u32, rgba)
            .ok_or_else(|| "Clipboard image data is invalid.".to_string())?;
        let original_bytes = encode_png(&rgba_image)?;

        if original_bytes.len() > MAX_IMAGE_PNG_BYTES {
            return Err("Clipboard image is larger than the history limit.".to_string());
        }

        let thumbnail = make_thumbnail(&rgba_image);
        let thumbnail_bytes = encode_png(&thumbnail)?;
        let safe_hash = hash.chars().take(24).collect::<String>();
        let image_dir = self.image_dir();
        let original_path = image_dir.join(format!("{safe_hash}.png"));
        let thumbnail_path = image_dir.join(format!("{safe_hash}-thumb.png"));

        fs::write(&original_path, &original_bytes)
            .map_err(|error| format!("Failed to write clipboard image: {error}"))?;
        fs::write(&thumbnail_path, &thumbnail_bytes)
            .map_err(|error| format!("Failed to write clipboard image thumbnail: {error}"))?;

        Ok(ClipboardHistoryImage {
            width,
            height,
            byte_size: original_bytes.len() as u64,
            original_path: original_path.to_string_lossy().to_string(),
            thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
            thumbnail_data_url: None,
        })
    }

    fn enforce_limit_locked(&self, state: &mut ClipboardHistoryState) {
        let non_favorite_count = state.items.iter().filter(|item| !item.favorite).count();
        if non_favorite_count > state.settings.max_items {
            let mut excess = non_favorite_count - state.settings.max_items;
            let mut i = state.items.len();
            while i > 0 && excess > 0 {
                i -= 1;
                if !state.items[i].favorite {
                    let item = state.items.remove(i);
                    self.remove_item_files(&item);
                    excess -= 1;
                }
            }
        }
    }

    pub(super) fn flush(&self) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        if state.dirty {
            self.persist_locked(&state)?;
            state.dirty = false;
        }
        Ok(())
    }

    fn schedule_save(&self) {
        if let Some(tx) = SAVE_NOTIFY_TX.get() {
            let _ = tx.try_send(());
        }
    }

    fn persist_locked(&self, state: &ClipboardHistoryState) -> Result<(), String> {
        let history = PersistedClipboardHistory {
            settings: state.settings.clone(),
            items: state.items.clone(),
        };
        super::store::save_history_atomic(&self.history_path(), &history)
            .map_err(|error| format!("Failed to write clipboard history: {error}"))
    }

    pub(super) fn remove_item_files(&self, item: &ClipboardHistoryItem) {
        if let Some(image) = &item.image {
            let image_dir = self.image_dir();
            for path in [&image.original_path, &image.thumbnail_path] {
                if let Ok(path) = super::image_access::managed_path(&image_dir, path) {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }

    fn snapshot_locked(state: &ClipboardHistoryState) -> ClipboardHistorySnapshot {
        ClipboardHistorySnapshot {
            settings: state.settings.clone(),
            items: state.items.clone(),
            recovered_from_backup: state.recovered_from_backup,
        }
    }

    /// Called after the state lock is released.
    fn emit_changed(&self) {
        let _ = self.app.emit(HISTORY_CHANGED_EVENT, ());
    }

    fn emit_shortcut(&self) {
        // Only the main frontend routes this event, using its saved presentation setting.
        let _ = self.app.emit(HOTKEY_EVENT, ());
    }
}

impl ClipboardCapture {
    fn hash(&self) -> &str {
        match self {
            Self::Text { hash, .. } | Self::Image { hash, .. } | Self::Files { hash, .. } => hash,
        }
    }
}

fn read_clipboard_capture(capture_images: bool) -> Result<Option<ClipboardCapture>, String> {
    let mut clipboard = Clipboard::new().map_err(|error| error.to_string())?;

    // Files first: Explorer puts only CF_HDROP, but some programs add the names as text too.
    if let Ok(files) = clipboard.get().file_list() {
        let paths: Vec<String> = files.iter().map(|path| path.to_string_lossy().to_string()).filter(|path| !path.is_empty()).collect();
        if !paths.is_empty() {
            let hash = hash_bytes([b"files:", paths.join("
").as_bytes()].concat().as_slice());
            return Ok(Some(ClipboardCapture::Files { hash, paths }));
        }
    }

    if let Ok(text) = clipboard.get_text() {
        if !text.trim().is_empty() {
            let hash = hash_bytes([b"text:", text.as_bytes()].concat().as_slice());
            return Ok(Some(ClipboardCapture::Text {
                hash,
                preview: preview_text(&text),
                text,
            }));
        }
    }

    if capture_images {
        if let Ok(image) = clipboard.get_image() {
            let mut hash_input = Vec::with_capacity(16 + image.bytes.len());
            hash_input.extend_from_slice(&image.width.to_le_bytes());
            hash_input.extend_from_slice(&image.height.to_le_bytes());
            hash_input.extend_from_slice(&image.bytes);
            let hash = hash_bytes(&hash_input);

            return Ok(Some(ClipboardCapture::Image {
                hash,
                width: image.width,
                height: image.height,
                rgba: image.bytes.into_owned(),
            }));
        }
    }

    Ok(None)
}

fn write_clipboard_text(text: &str) -> Result<(), String> {
    retry_clipboard_write("set clipboard text", || {
        Clipboard::new()
            .map_err(|error| format!("Failed to open clipboard: {error}"))?
            .set_text(text.to_owned())
            .map_err(|error| format!("Failed to set clipboard text: {error}"))
    })
}

fn write_clipboard_files(paths: &[String]) -> Result<(), String> {
    let paths: Vec<std::path::PathBuf> = paths.iter().map(std::path::PathBuf::from).collect();
    retry_clipboard_write("set clipboard files", || {
        Clipboard::new()
            .map_err(|error| format!("Failed to open clipboard: {error}"))?
            .set()
            .file_list(&paths)
            .map_err(|error| format!("Failed to set clipboard files: {error}"))
    })
}

/// "report.docx", or "report.docx and 2 more" in the language-neutral form the row shows
/// next to its file icon: names only, as the full paths stay searchable in `text`.
fn files_preview(paths: &[String]) -> String {
    let names: Vec<String> = paths
        .iter()
        .map(|path| std::path::Path::new(path).file_name().map_or_else(|| path.clone(), |name| name.to_string_lossy().to_string()))
        .collect();
    preview_text(&names.join(", "))
}

fn write_clipboard_image(width: usize, height: usize, image: &RgbaImage) -> Result<(), String> {
    retry_clipboard_write("set clipboard image", || {
        Clipboard::new()
            .map_err(|error| format!("Failed to open clipboard: {error}"))?
            .set_image(ImageData {
                width,
                height,
                bytes: Cow::Owned(image.as_raw().clone()),
            })
            .map_err(|error| format!("Failed to set clipboard image: {error}"))
    })
}

fn retry_clipboard_write(
    action: &str,
    mut write: impl FnMut() -> Result<(), String>,
) -> Result<(), String> {
    let mut last_error = None;

    for attempt in 0..CLIPBOARD_WRITE_RETRY_ATTEMPTS {
        match write() {
            Ok(()) => return Ok(()),
            Err(error) => {
                last_error = Some(error);

                if attempt + 1 < CLIPBOARD_WRITE_RETRY_ATTEMPTS {
                    thread::sleep(CLIPBOARD_WRITE_RETRY_DELAY);
                }
            }
        }
    }

    Err(format!(
        "Failed to {action} after {CLIPBOARD_WRITE_RETRY_ATTEMPTS} attempts: {}",
        last_error.unwrap_or_else(|| "unknown error".to_string())
    ))
}

pub(super) fn start_workers() {
    // Clipboard reads can block while another process owns the clipboard. Keep at most one
    // pending read so a busy clipboard cannot build an unbounded backlog of work.
    let (tx, rx) = mpsc::sync_channel::<()>(1);
    let _ = CLIPBOARD_NOTIFY_TX.set(Mutex::new(Some(tx)));

    let (save_tx, save_rx) = mpsc::sync_channel::<()>(1);
    let _ = SAVE_NOTIFY_TX.set(save_tx);

    thread::spawn(move || {
        while rx.recv().is_ok() {
            if let Ok(service) = service() {
                service.capture_current_clipboard();
            }
        }
    });

    thread::spawn(move || {
        while save_rx.recv().is_ok() {
            loop {
                thread::sleep(Duration::from_millis(500));
                if save_rx.try_recv().is_err() {
                    break;
                }
            }
            if let Ok(service) = service() {
                let _ = service.flush();
            }
        }
    });

    thread::spawn(|| {
        if let Err(error) = run_windows_clipboard_listener() {
            eprintln!("clipboard listener fell back to polling only: {error}");

            loop {
                thread::sleep(POLL_INTERVAL);
                notify_clipboard_changed();
            }
        }
    });
}

pub(super) fn notify_clipboard_changed() {
    if let Some(sender) = CLIPBOARD_NOTIFY_TX
        .get()
        .and_then(|sender| sender.lock().ok())
        .and_then(|sender| sender.as_ref().cloned())
    {
        let _ = sender.try_send(());
    }
}

fn run_windows_clipboard_listener() -> Result<(), String> {
    let class_name = "SkerryClipboardHistoryListener";
    let instance = message_window::module_instance().map_err(|error| error.to_string())?;

    if message_window::register_class::<ClipboardWindow>(instance, class_name).is_err() {
        return Err("Failed to register clipboard listener window class.".to_string());
    }

    let hwnd = message_window::create_message_only_window(
        instance,
        class_name,
        "Skerry Clipboard History Listener",
    )
    .map_err(|error| error.to_string())?;

    win32::clipboard::add_format_listener(hwnd).map_err(|error| error.to_string())?;
    if let Some(window) = CLIPBOARD_HOTKEY_WINDOW.get() {
        if let Ok(mut stored_window) = window.lock() {
            *stored_window = Some(hwnd.0 as isize);
        }
    } else {
        let _ = CLIPBOARD_HOTKEY_WINDOW.set(Mutex::new(Some(hwnd.0 as isize)));
    }
    refresh_registered_hotkey(hwnd);

    message_window::run_message_loop();

    unregister_current_hotkey(hwnd);
    let _ = win32::clipboard::remove_format_listener(hwnd);

    Ok(())
}

struct ClipboardWindow;

impl WindowMessages for ClipboardWindow {
    fn handle(hwnd: HWND, message: u32, wparam: WPARAM, _: LPARAM) -> Option<LRESULT> {
        if message == WM_CLIPBOARDUPDATE {
            notify_clipboard_changed();
            return Some(LRESULT(0));
        }

        if message == WM_HOTKEY && wparam.0 == HOTKEY_ID as usize {
            if let Ok(service) = service() {
                service.emit_shortcut();
            }
            return Some(LRESULT(0));
        }

        if message == HOTKEY_REFRESH_MESSAGE {
            refresh_registered_hotkey(hwnd);
            return Some(LRESULT(0));
        }

        if message == WM_QUERYENDSESSION {
            if let Ok(service) = service() {
                let _ = service.flush();
            }
            return Some(LRESULT(1));
        }

        if message == WM_ENDSESSION {
            if let Ok(service) = service() {
                let _ = service.flush();
            }
            return Some(LRESULT(0));
        }

        None
    }
}
