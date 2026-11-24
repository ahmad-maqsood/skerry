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
  /** Source name and titles of the island pop-up for the charger being plugged in or unplugged. */
  batteryName: string;
  chargerPluggedIn: string;
  chargerUnplugged: string;
  /** Source name and body of the island pop-up for a Bluetooth device connecting; its title is the device's name. */
  bluetoothName: string;
  bluetoothConnected: string;
  /** Source name and titles of the island pop-up for airplane mode being switched on or off. */
  airplaneName: string;
  airplaneOn: string;
  airplaneOff: string;
  /** Body of that pop-up: the battery level, e.g. "85%". */
  batteryLevel: (percent: number) => string;
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
  batteryName: "Battery",
  chargerPluggedIn: "Charger plugged in",
  chargerUnplugged: "Charger unplugged",
  bluetoothName: "Bluetooth",
  bluetoothConnected: "Connected",
  airplaneName: "Airplane mode",
  airplaneOn: "Airplane mode on",
  airplaneOff: "Airplane mode off",
  batteryLevel: (percent) => `${percent}%`,
  noticeOpen: (app) => `Open ${app}`,
  noticeReader: (sender) => `Full notification from ${sender}`,
  notificationsCount: (count) => `${count} notification${count === 1 ? "" : "s"}`,
  appNotifications: (app, count) => `${app} (${count})`,
  label: (text) => `Notification: ${text}`,
  previewFormat: (app, title, body) => `${app} · ${title}: ${body}`,
};
