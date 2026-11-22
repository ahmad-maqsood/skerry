export type SettingsConfigTransferText = {
  title: string; hint: string; export: string; import: string; includeHistory: string;
  exportHint: string; continue: string; cancel: string; exported: string; busy: string;
  confirm: string; confirmAgain: string; confirmAction: string; restartAction: string;
  success: string; credentials: string; missingPlugins: string; warnings: string; dismiss: string;
  invalidJson: string; wrongApp: string; unsupportedVersion: string; invalidStructure: string;
  tooLarge: string; storageUnavailable: string; storageRollbackFailed: string; failed: string;
  clipboardIncluded: string; clipboardExcluded: string; startupFailed: string;
};


export const en: SettingsConfigTransferText = {
  title: "Backup & transfer", hint: "Move settings, todos, notes and plugin preferences to another computer. Keys and window positions are excluded.",
  export: "Export configuration…", import: "Import configuration…", includeHistory: "Include clipboard history",
  exportHint: "All settings and user data are included by default. Clipboard history may contain private information; include it only when needed.",
  continue: "Choose save location…", cancel: "Cancel", exported: "Configuration exported.", busy: "Working…",
  confirm: "This will replace all current settings and todos. Export a backup of this computer first.",
  confirmAgain: "Confirm again: Skerry will restart and replace your settings, todos, notes and plugin preferences with this backup.",
  confirmAction: "Continue import", restartAction: "Replace and restart",
  success: "Configuration import completed.", credentials: "If used, re-enter mail authorization codes, translation API keys and plugin secrets, and reconnect accounts such as WorkBuddy / Doubao.",
  missingPlugins: "Reinstall these plugin versions from the plugin market. Their non-secret preferences have been kept:",
  warnings: "Check the following items:", dismiss: "Got it",
  invalidJson: "This is not valid JSON. Choose a configuration backup exported by Skerry.",
  wrongApp: "This is not a Skerry configuration backup.", unsupportedVersion: "This backup version or legacy theme format is not supported. Update Skerry or export a new configuration backup.",
  invalidStructure: "The backup is incomplete or contains invalid data. Nothing was imported.", tooLarge: "The backup exceeds 256 MB. Export again without clipboard history.",
  storageUnavailable: "Local settings could not be written. Restoring the original configuration was attempted. Check free space and try again.",
  storageRollbackFailed: "Local storage is unavailable and the original configuration could not be fully restored. Keep your backup and import again after storage recovers.",
  failed: "Configuration transfer failed: ", clipboardIncluded: "This backup includes clipboard history and will replace the current history.",
  clipboardExcluded: "This backup excludes clipboard history. This computer's history will remain; clipboard preferences will be updated.",
  startupFailed: "Configuration recovery could not finish. Restart Skerry and try again.",
};
