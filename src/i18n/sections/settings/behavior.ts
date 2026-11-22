export type SettingsBehaviorText = {
  title: string;
  /** Settings open in their own window instead of as a page of the island. */
  detachedSettings: string;
  detachedSettingsHint: string;
  trayVisible: string;
  trayVisibleHint: string;
  traySaveFailed: string;
  trayUpdateFailed: (reason: string) => string;
};


export const en: SettingsBehaviorText = {
  title: "Startup & language",
  detachedSettings: "Separate settings window",
  detachedSettingsHint: "When off, settings open as a page of the island",
  trayVisible: "Show icon in the notification area",
  trayVisibleHint: "Restore it here, or launch Skerry again to open settings",
  traySaveFailed: "Could not save this preference; the icon may reappear next time",
  trayUpdateFailed: (reason) => `Could not change the tray icon: ${reason}`,
};
