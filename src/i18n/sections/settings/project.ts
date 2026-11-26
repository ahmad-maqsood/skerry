export type SettingsProjectText = {
  title: string;
  appName: string;
  versionChip: (version: string) => string;
  description: string;
  /** The last card of About: resetting every setting, and quitting the island. */
  quit: string;
  quitHint: string;
  quitAction: string;
  repository: string;
  repositoryHint: string;
  licenseCredits: string;
  licenseCreditsHint: string;
  openFailed: string;
  /** The todo the island adds when a new version is found, and its button. */
  update: {
    downloadingUnknown: string;
    updateTodo: string;
    updateNow: string;
    availableHint: string;
    updateDownloading: (percent: number) => string;
    installing: string;
    /** The row while a failed install waits to be retried. */
    failedRetry: string;
  };
  /** About → the updates group: the automatic-update switch, the status, and checking by hand. */
  autoUpdate: {
    title: string;
    hint: string;
    status: string;
    check: string;
    installNow: string;
    readyTitle: (version: string) => string;
    readyHint: string;
    idle: string;
    checking: string;
    latest: string;
    available: (version: string) => string;
    downloading: (version: string, percent: number | null) => string;
    ready: (version: string) => string;
    installing: string;
    done: string;
    error: (reason: string) => string;
    disabled: string;
  };
  /** Shown instead of the updates group in the Microsoft Store version. */
  storeUpdate: {
    title: string;
    reason: string;
    linkTitle: string;
    linkHint: string;
  };
};


export const en: SettingsProjectText = {
  title: "About the island",
  appName: "Skerry",
  versionChip: (version) => `v${version}`,
  description: "Todos, clipboard, music, quick translation, AI status, and message alerts, gathered at the top of the screen.",
  quit: "Quit the island",
  quitHint: "Same as Quit in the tray menu; start it again from the Start menu or a desktop shortcut.",
  quitAction: "Quit",
  repository: "Source code repository",
  repositoryHint: "View source and releases on GitHub",
  licenseCredits: "Licence and credits",
  licenseCreditsHint: "View NOTICE.md and open source licensing",
  openFailed: "Couldn't open your browser. Please try again.",
  update: {
    downloadingUnknown: "Downloading…",
    updateTodo: "New version available",
    updateNow: "Update",
    availableHint: "Update available",
    updateDownloading: (percent) => `Downloading ${percent}%`,
    installing: "Installing; the island will restart itself",
    failedRetry: "Update failed; click to retry",
  },
  autoUpdate: {
    title: "Automatic updates",
    hint: "Checks every 3 hours and downloads in the background; installs and restarts once the island is collapsed and untouched for 1 minute, with a red dot in the meantime. When off, check here by hand.",
    status: "Check for updates",
    check: "Check now",
    installNow: "Install now",
    readyTitle: (version) => `v${version} downloaded`,
    readyHint: "The island closes while installing and reopens afterwards.",
    idle: "Not checked yet",
    checking: "Checking…",
    latest: "You're up to date",
    available: (version) => `New version v${version} found`,
    downloading: (version, percent) => percent === null ? `Downloading v${version}…` : `Downloading v${version}… ${percent}%`,
    ready: (version) => `v${version} is downloaded and ready to install`,
    installing: "Installing; the island will restart itself",
    done: "The installer has started",
    error: (reason) => `Something went wrong: ${reason}`,
    disabled: "This build can't update itself",
  },
  storeUpdate: {
    title: "Automatic updates don't work in this version",
    reason: "You're using the Microsoft Store version. Windows doesn't let a Store app replace its own files, so Skerry's built-in updater is turned off. The Microsoft Store delivers updates instead, and new versions may arrive there later than on GitHub.",
    linkTitle: "Download the GitHub version",
    linkHint: "Get Skerry's built-in automatic updates. Before switching: export a backup (General, Backup & transfer), uninstall this version (this removes its data), install the GitHub version, then import the backup. API keys aren't included, so enter them again.",
  },
};
