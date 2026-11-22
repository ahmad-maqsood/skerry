import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";

// Corresponds to FileShelfItem / FileShelfEntry in src-tauri/src/file_shelf/mod.rs.
export type FileShelfItem = {
  id: string;
  path: string;
  name: string;
  isDir: boolean;
  /** Bytes for a file; 0 for a folder. */
  size: number;
  addedAt: number;
  /** Kept at the top, and never removed by auto cleanup or the entry cap. */
  pinned: boolean;
  /** The original was moved, renamed or deleted since it was added. */
  missing: boolean;
  /** Its drive or network share did not answer; whether it exists is unknown. */
  unreachable: boolean;
};

// Corresponds to FileShelfSnapshot in src-tauri/src/file_shelf/mod.rs.
export type FileShelfSnapshot = {
  items: FileShelfItem[];
};

// Corresponds to FileShelfOptions in src-tauri/src/file_shelf/store.rs.
export type FileShelfOptions = {
  maxItems: number;
  /** Entries added more than this many days ago leave the list; 0 keeps them. */
  maxAgeDays: number;
  removeMissing: boolean;
};

export function getFileShelf() {
  return invoke<FileShelfSnapshot>("get_file_shelf");
}

/** Hands the cleanup options to the shelf, which applies them at once. */
export function setFileShelfOptions(options: FileShelfOptions) {
  return invoke<FileShelfSnapshot>("set_file_shelf_options", { options });
}

export function addFileShelfPaths(paths: string[]) {
  return invoke<FileShelfSnapshot>("add_file_shelf_paths", { paths });
}

/** Writes the new user's welcome note (a .txt file) and puts it on the shelf. */
export function addFileShelfWelcome(fileName: string, content: string) {
  return invoke<FileShelfSnapshot>("add_file_shelf_welcome", { fileName, content });
}

export function removeFileShelfItems(ids: string[]) {
  return invoke<FileShelfSnapshot>("remove_file_shelf_items", { ids });
}

export function toggleFileShelfPin(id: string) {
  return invoke<FileShelfSnapshot>("toggle_file_shelf_pin", { id });
}

/** A small PNG data URL previewing an image entry, or null for other files. */
export function getFileShelfThumbnail(id: string) {
  return invoke<string | null>("get_file_shelf_thumbnail", { id });
}

/** Explorer's icon for the entry as a PNG data URL; `available` false uses only its type's icon. */
export function getFileShelfIcon(id: string, available: boolean) {
  return invoke<string | null>("get_file_shelf_icon", { id, available });
}

export function clearFileShelf() {
  return invoke<FileShelfSnapshot>("clear_file_shelf");
}

/** Puts the files on the clipboard as Explorer's Copy does. */
export function copyFileShelfItems(ids: string[]) {
  return invoke<void>("copy_file_shelf_items", { ids });
}

export function openFileShelfItem(id: string) {
  return invoke<void>("open_file_shelf_item", { id });
}

export function revealFileShelfItem(id: string) {
  return invoke<void>("reveal_file_shelf_item", { id });
}

/**
 * Starts a native drag while the button is held; resolves when it ends. With
 * `removeAfter`, entries a target accepted leave the shelf.
 */
export function startFileShelfDrag(ids: string[], removeAfter: boolean) {
  return invoke<FileShelfSnapshot>("start_file_shelf_drag", { ids, removeAfter });
}

export type FileDropEvent =
  | { type: "enter"; paths: string[] }
  | { type: "drop"; paths: string[] }
  | { type: "leave" };

/** Files dragged over and dropped on the island window. Caller is responsible for unsubscribing on unmount. */
export function listenFileDrop(handler: (event: FileDropEvent) => void): Promise<UnlistenFn> {
  return getCurrentWebview().onDragDropEvent(({ payload }) => {
    if (payload.type === "enter" || payload.type === "drop") {
      handler({ type: payload.type, paths: payload.paths });
    } else if (payload.type === "leave") {
      handler({ type: "leave" });
    }
  });
}

// Corresponds to CHANGED_EVENT in src-tauri/src/file_shelf/plugin_view.rs: plugin modified file shelf list.
const FILE_SHELF_CHANGED_EVENT = "file-shelf-changed";

/** Calls `onChange` when a plugin changed the shelf; resolves to the unlisten function. */
export function listenFileShelfChanged(onChange: () => void) {
  return listen(FILE_SHELF_CHANGED_EVENT, () => onChange());
}
