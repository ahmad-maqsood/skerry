import { en as clockWeatherEn, type ClockWeatherText } from "./clockWeather.ts";

export type SettingsPluginsText = {
  clockWeather: ClockWeatherText;
  empty: string; installed: string; available: string; install: string; update: string;
  uninstall: string; enabled: string; permissions: string; retry: string; save: string;
  developer: string; developerMode: string; develop: string; unavailable: string; index: string; directory: string; load: string; secret: string; loading: string;
  status: Record<string, string>; permission: Record<string, string>;
  plan: string; comingSoon: string; invitation: string; guide: string;
  guideHint: string; readGuide: string; openGuideFailed: string; pluginGuide: string; sections: string; noneAvailable: string; permissionsNotice: string; trustNotice: string; version: string;
};


export const en: SettingsPluginsText = {
  clockWeather: clockWeatherEn,
  plan: "Plugin development", comingSoon: "Plugins are coming soon",
  invitation: "A plugin upgrades an island feature or adds a new one, and becomes part of the island once installed; plugins are optional and downloaded on demand. Build one from the island's source and open a pull request.",
  guide: "Plugin development guide", guideHint: "What a plugin is, how to change the island's source, the demo and details a PR needs, and how review and release work.",
  readGuide: "Read guide", openGuideFailed: "Could not open the guide. Please try again.",
  empty: "No plugins yet", installed: "Installed", available: "Available", install: "Install", update: "Update",
  uninstall: "Uninstall", version: "Version", pluginGuide: "Guide", sections: "Plugin lists", noneAvailable: "No other plugins available",
  permissionsNotice: "Listed by the plugin. Skerry does not enforce limits on file or network access.",
  trustNotice: "Plugins run as programs with your Windows account’s access. Install only plugins you trust.",
  enabled: "Enable", permissions: "Permissions", retry: "Refresh", save: "Save",
  developer: "Developer", developerMode: "Developer mode", develop: "Develop plugins", unavailable: "Couldn’t get the plugin list. The latest release may not include plugins yet.", index: "Plugin index", directory: "Local plugin folder", load: "Load", secret: "Enter to replace credential", loading: "Loading plugins…",
  status: { starting: "Starting", running: "Running", restarting: "Restarting", stopped: "Disabled", failed: "Failed to start" },
  permission: { network: "Network", "read-home-files": "Local files", notifications: "Messages", quota: "Quota", sessions: "Sessions", "desktop-windows": "Desktop windows", "private-browser": "Private sign-in" },
};
