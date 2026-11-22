export type FileShelfText = {
  title: string;
  /** The note a new user finds on the shelf: its file name (without .txt) and its text. */
  welcomeFileName: string;
  welcomeContent: string;
  clear: string;
  confirmClear: string;
  empty: string;
  /** Under the empty message: the shelf keeps references, not copies. */
  emptyNote: string;
  /** Under the tiles: how to take files back out. */
  dropHint: string;
  /** The open place after a few tiles, where more files can be dropped. */
  moreSlot: string;
  folder: string;
  missing: string;
  copyItem: string;
  copied: string;
  reveal: string;
  removeItem: string;
  alreadyOnShelf: string;
  unreachable: string;
  pin: string;
  unpin: string;
  searchPlaceholder: string;
  searchLabel: string;
  clearSearch: string;
  emptySearch: string;
  selectedCount: (count: number) => string;
  copySelected: string;
  removeSelected: string;
  clearSelection: string;
};


export const en: FileShelfText = {
  title: "File shelf",
  welcomeFileName: "Welcome to the file shelf",
  welcomeContent: `Hi! This is the file shelf.

Drop files or folders on the island to park them here, then drag them out into another window, a chat or a folder when you need them.

The shelf only remembers where files are; it never copies or moves them.
Remove this note from the shelf once you have read it; it will not come back.
`,
  clear: "Clear shelf",
  confirmClear: "Confirm clear (files are kept)",
  empty: "Drop files on the island to keep them here",
  emptyNote: "Only the location is kept, never a copy; removing leaves the file alone",
  dropHint: "Release to add to the shelf",
  moreSlot: "Room for more",
  folder: "Folder",
  missing: "Missing",
  copyItem: "Copy the file to paste elsewhere",
  copied: "Copied",
  reveal: "Show in folder",
  removeItem: "Remove from shelf (the file is kept)",
  alreadyOnShelf: "Already on the shelf",
  unreachable: "Unavailable",
  pin: "Pin (kept by auto cleanup)",
  unpin: "Unpin",
  searchPlaceholder: "Search name or path",
  searchLabel: "Search the file shelf",
  clearSearch: "Clear search",
  emptySearch: "No matching files",
  selectedCount: (count) => `${count} selected`,
  copySelected: "Copy selected files",
  removeSelected: "Remove selected from shelf (files are kept)",
  clearSelection: "Clear selection",
};
