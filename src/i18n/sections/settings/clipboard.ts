export type SettingsClipboardText = {
  title: string;
  displayTitle: string;
  paused: string;
  pausedHint: string;
  captureImages: string;
  maxItems: string;
  retention: string;
  retentionForever: string;
  retention90Days: string;
  retention30Days: string;
  retention7Days: string;
  imageCacheBudget: string;
  visibleRows: string;
  detached: string;
  /** Unpinned clipboard window closes when another window is clicked. */
  closeOnBlur: string;
  closeOnBlurHint: string;
  /** Where the history and its images are stored. */
  storageTitle: string;
  storageFolder: string;
  storageHint: string;
  storageMove: string;
  storageMoving: string;
  storageMoved: string;
  storageReset: string;
  storageChoose: string;
  storageSizeLabel: string;
  storageOpen: string;
  storageClear: string;
  storageClearConfirm: string;
  storageClearDone: string;
  storageUnencryptedNotice: string;
  recoveredNotice: string;
  startupHint: string;
  shortcut: string;
  shortcutEnabled: string;
  pressKeys: string;
};

export const en: SettingsClipboardText = {
  title: "What's saved",
  displayTitle: "Display & window",
  paused: "Pause recording",
  pausedHint: "Temporarily stop recording copied items",
  captureImages: "Record images",
  maxItems: "Max entries",
  retention: "Keep history for",
  retentionForever: "Forever",
  retention90Days: "90 days",
  retention30Days: "30 days",
  retention7Days: "7 days",
  imageCacheBudget: "Image cache budget",
  visibleRows: "Visible rows",
  detached: "Open in a separate window",
  closeOnBlur: "Close when clicking elsewhere",
  closeOnBlurHint: "Only while the window is not pinned",
  storageTitle: "Storage",
  storageFolder: "Clipboard data folder",
  storageHint: "Changing the folder moves the existing history and images with it; old files are removed only after everything has been copied",
  storageMove: "Move here",
  storageMoving: "Moving...",
  storageMoved: "Moved",
  storageReset: "Use default folder",
  storageChoose: "Choose the clipboard data folder",
  storageSizeLabel: "Size on disk",
  storageOpen: "Open folder",
  storageClear: "Clear history",
  storageClearConfirm: "Clear history and remove all unpinned items?",
  storageClearDone: "History cleared",
  storageUnencryptedNotice: "Clipboard history and images are stored unencrypted in this folder.",
  recoveredNotice: "Clipboard history was recovered from a backup after the main file was corrupted.",
  startupHint: "Entries copied while the island is not running are not recorded.",
  shortcut: "Expand shortcut",
  shortcutEnabled: "Enable expand shortcut",
  pressKeys: "Press keys",
};
