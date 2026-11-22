export type ClipboardText = {
  pinWindow: string;
  unpinWindow: string;
  moveWindow: string;
  closeWindow: string;
  windowActionFailed: string;
  selectEntries: string;
  selectItem: (preview: string) => string;
  selectAll: string;
  deselectAll: string;
  finishSelection: string;
  deleteSelected: (count: number) => string;
  deleteFailed: string;
  imagePreview: string;
  closePreview: string;
  loadingImage: string;
  previewFailed: string;
  imageSize: (width: number, height: number) => string;
  title: string;
  favoriteCount: (count: number) => string;
  expandShortcut: string;
  clear: string;
  confirmClear: string;
  clearHistory: string;
  segments: string;
  all: string;
  favorites: string;
  /** The type filter next to the tabs; pressing the active type again shows every type. */
  kinds: string;
  kindText: string;
  kindImage: string;
  kindFile: string;
  searchPlaceholder: string;
  searchLabel: string;
  clearSearch: string;
  emptyAll: string;
  emptyFavorites: string;
  emptySearch: string;
  copyBack: string;
  copy: string;
  copied: string;
  favorite: string;
  favoriteItem: string;
  unfavoriteItem: string;
  delete: string;
  deleteItem: string;
  notePlaceholder: string;
  noteInputLabel: string;
  saveNote: string;
  cancelEditNote: string;
  editNote: (note: string) => string;
  editNoteLabel: string;
  addNoteLabel: string;
  noteFallback: string;
};


export const en: ClipboardText = {
  pinWindow: "Keep window on top",
  unpinWindow: "Unpin window",
  moveWindow: "Move window",
  closeWindow: "Close clipboard window",
  windowActionFailed: "Window action failed. Try again.",
  selectEntries: "Select entries",
  selectItem: (preview) => `Select entry: ${preview}`,
  selectAll: "Select all (excl. favorites)",
  deselectAll: "Deselect all",
  finishSelection: "Done selecting",
  deleteSelected: (count) => `Delete ${count} selected`,
  deleteFailed: "Couldn't delete. Try again.",
  imagePreview: "Preview image",
  closePreview: "Close preview",
  loadingImage: "Loading full image…",
  previewFailed: "Full image unavailable. Showing thumbnail.",
  imageSize: (width, height) => `${width} × ${height} px`,
  title: "Clipboard history",
  favoriteCount: (count) => (count === 1 ? "1 favorite" : `${count} favorites`),
  expandShortcut: "Expand shortcut",
  clear: "Clear",
  confirmClear: "Confirm clear",
  clearHistory: "Clear clipboard history",
  segments: "Clipboard tabs",
  all: "All",
  favorites: "Starred",
  kinds: "Filter by type",
  kindText: "Text",
  kindImage: "Images",
  kindFile: "Files",
  searchPlaceholder: "Search content or note",
  searchLabel: "Search clipboard content or note",
  clearSearch: "Clear search",
  emptyAll: "Copied text and images show up here",
  emptyFavorites: "No starred entries yet",
  emptySearch: "No matching entries",
  copyBack: "Copy back to clipboard",
  copy: "Copy",
  copied: "Copied",
  favorite: "Star",
  favoriteItem: "Star entry",
  unfavoriteItem: "Unstar entry",
  delete: "Delete",
  deleteItem: "Delete entry",
  notePlaceholder: "Note what this is",
  noteInputLabel: "Clipboard entry note",
  saveNote: "Save note",
  cancelEditNote: "Cancel editing note",
  editNote: (note) => `Edit note: ${note}`,
  editNoteLabel: "Add note to clipboard entry",
  addNoteLabel: "Add note to clipboard entry",
  noteFallback: "Note",
};
