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
  /** Source name and titles of the island pop-up for Caps Lock being switched on or off. */
  capsLockName: string;
  capsLockOn: string;
  capsLockOff: string;
  /** Source names of the volume and brightness pop-ups; the pop-up's label reads e.g. "Volume · 45%". */
  volumeName: string;
  brightnessName: string;
  /** Body of that pop-up: the battery level, e.g. "85%". */
  batteryLevel: (percent: number) => string;
  noticeOpen: (app: string) => string;
  noticeReader: (sender: string) => string;
  notificationsCount: (count: number) => string;
  appNotifications: (app: string, count: number) => string;
  label: (text: string) => string;
  previewFormat: (app: string, title: string, body: string) => string;
  /** The switch between the system notifications and what plugins report. */
  sections: string;
  sectionSystem: string;
  sectionPlugins: string;
  /** Heading above what a plugin reports as running tasks, e.g. "GitHub activity". */
  pluginActivity: (plugin: string) => string;
  /** Label of the dropdown that narrows the Plugins section to one plugin, and its choice for all of them. */
  pluginFilter: string;
  allPlugins: string;
  /** The state of a plugin task (a workflow run, say). */
  sessionStatus: { running: string; waiting: string; completed: string };
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
  capsLockName: "Caps Lock",
  capsLockOn: "Caps Lock on",
  capsLockOff: "Caps Lock off",
  volumeName: "Volume",
  brightnessName: "Brightness",
  batteryLevel: (percent) => `${percent}%`,
  noticeOpen: (app) => `Open ${app}`,
  noticeReader: (sender) => `Full notification from ${sender}`,
  notificationsCount: (count) => `${count} notification${count === 1 ? "" : "s"}`,
  appNotifications: (app, count) => `${app} (${count})`,
  label: (text) => `Notification: ${text}`,
  previewFormat: (app, title, body) => `${app} · ${title}: ${body}`,
  sections: "Notification sections",
  sectionSystem: "System",
  sectionPlugins: "Plugins",
  pluginActivity: (plugin) => `${plugin} activity`,
  pluginFilter: "Show plugin",
  allPlugins: "All plugins",
  sessionStatus: { running: "Running", waiting: "Waiting", completed: "Done" },
};
