export type SettingsWidgetsText = {
  title: string;
  clock: string;
  clockHint: string;
  footer: string;
  /** The clock widget's day and month names, in capitals on the widget. */
  clockNames: { weekdays: string[]; months: string[] };
};

export const en: SettingsWidgetsText = {
  title: "Widgets",
  clock: "Clock",
  clockHint: "The weekday, date and time on your desktop. Drag it anywhere; its colour follows the wallpaper behind it.",
  footer: "Widgets sit on the desktop, under your windows, and use extra power only while switched on.",
  clockNames: {
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
};
