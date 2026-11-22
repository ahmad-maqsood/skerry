export type MessagesText = {
  title: string;
  clearAll: string;
  clearOne: string;
  noNotifications: string;
  openApp: string;
  yesterday: string;
  newMessage: string;
  /** Title of the island pop-up for a text just copied. */
  copiedToClipboard: string;
  noticeOpen: (app: string) => string;
  noticeReader: (sender: string) => string;
  notificationsCount: (count: number) => string;
  appNotifications: (app: string, count: number) => string;
  label: (text: string) => string;
  previewFormat: (app: string, title: string, body: string) => string;
};


export const en: MessagesText = {
  title: "Notifications",
  clearAll: "Clear all",
  clearOne: "Clear",
  noNotifications: "No notifications",
  openApp: "Open application",
  yesterday: "Yesterday",
  newMessage: "New notification",
  copiedToClipboard: "Copied",
  noticeOpen: (app) => `Open ${app}`,
  noticeReader: (sender) => `Full notification from ${sender}`,
  notificationsCount: (count) => `${count} notification${count === 1 ? "" : "s"}`,
  appNotifications: (app, count) => `${app} (${count})`,
  label: (text) => `Notification: ${text}`,
  previewFormat: (app, title, body) => `${app} · ${title}: ${body}`,
};
