export type SettingsMessageSourcesText = {
  previewTitle: string;
  previewSeconds: string;
  autoExpand: string;
  autoExpandHint: string;
  expandMaxWidth: string;
  expandMaxHeight: string;
  expandSeconds: string;
  gameNotices: string;
  gameNoticesHint: string;
  gameNoticeSeconds: string;
  popupClipboard: string;
  popupClipboardHint: string;
  popupMusic: string;
  popupMusicHint: string;
  masterToggle: string;
  masterToggleHint: string;
  accessStatus: string;
  accessAllowed: string;
  accessDenied: string;
  accessRequired: string;
  openWindowsSettings: string;
  hideMessageText: string;
  hideMessageTextHint: string;
  appMuteList: string;
  appMuteListHint: string;
  noAppsSeen: string;
  mute: string;
  unmute: string;
};


export const en: SettingsMessageSourcesText = {
  previewTitle: "Island notifications",
  previewSeconds: "Display duration",
  autoExpand: "Expand long messages",
  autoExpandHint: "A longer notification grows the island with its text, so you can read and copy it right there; past the limit it scrolls.",
  expandMaxWidth: "Maximum width",
  expandMaxHeight: "Maximum height",
  expandSeconds: "Expanded duration",
  gameNotices: "Still show notifications",
  gameNoticesHint: "Shows notifications on the island during full-screen games, for display only: it never takes the focus, and clicks pass through to the game.",
  gameNoticeSeconds: "Notification duration",
  popupClipboard: "Show copied text",
  popupClipboardHint: "The island pops out for a moment to show a text as you copy it. Needs clipboard history to be on.",
  popupMusic: "Show new songs",
  popupMusicHint: "The island pops out for a moment to show the song when a new one starts playing.",
  masterToggle: "Receive system notifications",
  masterToggleHint: "Listens to incoming Windows toast notifications (WhatsApp, Telegram, Outlook, browsers, etc.) and displays them on the island.",
  accessStatus: "Notification access",
  accessAllowed: "Ready (allowed to read notifications)",
  accessDenied: "Denied (enable notification access in Windows Settings)",
  accessRequired: "Permission required (allow notification access in Windows Settings)",
  openWindowsSettings: "Open Windows Notification Settings",
  hideMessageText: "Hide message text",
  hideMessageTextHint: "Show only the app name and sender for privacy; message body is omitted.",
  appMuteList: "Per-app mute list",
  appMuteListHint: "Control which applications are allowed to show notification previews on the island.",
  noAppsSeen: "No applications detected yet. Apps that raise a notification will appear here for muting.",
  mute: "Mute",
  unmute: "Unmute",
};
