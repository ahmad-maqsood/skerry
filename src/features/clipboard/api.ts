import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Corresponds to the structure of the same name in src-tauri/src/clipboard_history/mod.rs.
export type ClipboardHistorySettings = {
  enabled: boolean;
  paused?: boolean;
  captureImages: boolean;
  maxItems: number;
  shortcut: string;
  shortcutEnabled: boolean;
  retentionDays?: number;
  imageCacheBudgetMb?: number;
};

export type ClipboardHistoryImage = {
  width: number;
  height: number;
  byteSize: number;
  originalPath: string;
  thumbnailPath: string;
  thumbnailDataUrl?: string;
};

export type ClipboardHistoryItem = {
  id: string;
  kind: "text" | "image";
  hash: string;
  createdAt: number;
  copiedAt: number;
  favorite?: boolean;
  note?: string;
  preview: string;
  text?: string;
  image?: ClipboardHistoryImage;
  /** Files copied in Explorer; such an item is a text item whose text is the paths. */
  files?: string[];
};

/** Corresponds to ClipboardStorageInfo in src-tauri/src/clipboard_history/location.rs. */
export type ClipboardStorageInfo = {
  directory: string;
  defaultDirectory: string;
  isDefault: boolean;
};

export type ClipboardStorageSize = {
  totalBytes: number;
  historyFileBytes: number;
  imagesBytes: number;
  itemsCount: number;
  imagesCount: number;
};

export type ClipboardHistorySnapshot = {
  settings: ClipboardHistorySettings;
  items: ClipboardHistoryItem[];
  recoveredFromBackup?: boolean;
};

// Matches HISTORY_CHANGED_EVENT in clipboard_history/mod.rs and HOTKEY_EVENT in clipboard_history/hotkey.rs.
export const CLIPBOARD_HISTORY_CHANGED_EVENT = "clipboard-history-changed";
export const CLIPBOARD_HISTORY_SHORTCUT_EVENT = "clipboard-history-shortcut";
// Matches HOTKEY_STATUS_EVENT in clipboard_history/hotkey.rs; payload is registration error, null on success or when closed.
export const CLIPBOARD_SHORTCUT_STATUS_EVENT = "clipboard-history-shortcut-status";

export function getClipboardHistory() {
  return invoke<ClipboardHistorySnapshot>("get_clipboard_history");
}

export function getClipboardShortcutError() {
  return invoke<string | null>("get_clipboard_shortcut_error");
}

export function setClipboardHistorySettings(settings: ClipboardHistorySettings) {
  return invoke<ClipboardHistorySnapshot>("set_clipboard_history_settings", { settings });
}

export function copyClipboardItem(id: string) {
  return invoke<ClipboardHistorySnapshot>("copy_clipboard_history_item", { id });
}

export function toggleClipboardFavorite(id: string) {
  return invoke<ClipboardHistorySnapshot>("toggle_clipboard_history_favorite", { id });
}

export function setClipboardItemNote(id: string, note: string) {
  return invoke<ClipboardHistorySnapshot>("set_clipboard_history_item_note", { id, note });
}

export function deleteClipboardItem(id: string) {
  return invoke<ClipboardHistorySnapshot>("delete_clipboard_history_item", { id });
}

export function deleteClipboardItems(ids: string[]) {
  return invoke<ClipboardHistorySnapshot>("delete_clipboard_history_items", { ids });
}

export function getClipboardStorageDirectory() {
  return invoke<ClipboardStorageInfo>("get_clipboard_storage_directory");
}

/** Moves the history and its images; an empty directory moves them back to the default. */
export function setClipboardStorageDirectory(directory: string) {
  return invoke<ClipboardStorageInfo>("set_clipboard_storage_directory", { directory });
}

/** The shared native folder picker (system/folder_dialog.rs), starting at `initialDirectory`. */
export function pickClipboardStorageDirectory(initialDirectory: string, title: string) {
  return invoke<string | null>("pick_folder", { initialDirectory, title });
}

export function readClipboardImage(id: string) {
  return invoke<string>("read_clipboard_history_image", { id });
}

/** The list thumbnail as a PNG data URL; the history snapshot no longer carries it. */
export function readClipboardThumbnail(id: string) {
  return invoke<string>("read_clipboard_history_thumbnail", { id });
}

/** The main frontend calls this only when a shortcut is routed to the island. */
export function showClipboardHistoryIsland() {
  return invoke<void>("show_clipboard_history_island");
}

export function getClipboardStorageSize() {
  return invoke<ClipboardStorageSize>("get_clipboard_storage_size");
}

export function openClipboardStorageFolder() {
  return invoke<void>("open_clipboard_storage_folder");
}

export function clearClipboardHistory() {
  return invoke<ClipboardHistorySnapshot>("clear_clipboard_history");
}

/** Returns a Promise resolving to an unlisten function; caller is responsible for unsubscribing on unmount. */
export function listenClipboardHistoryChanged(handler: () => void) {
  return listen(CLIPBOARD_HISTORY_CHANGED_EVENT, handler);
}

export function listenClipboardHistoryShortcut(handler: () => void) {
  return listen(CLIPBOARD_HISTORY_SHORTCUT_EVENT, handler);
}

export function listenClipboardShortcutStatus(handler: (error: string | null) => void) {
  return listen<string | null>(CLIPBOARD_SHORTCUT_STATUS_EVENT, (event) => handler(event.payload));
}
