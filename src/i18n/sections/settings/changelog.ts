export type SettingsChangelogText = {
  /** The status row above the list. */
  loading: string;
  loaded: (count: number) => string;
  /** Shown over the saved list when GitHub could not be reached. */
  showingSaved: string;
  failed: string;
  refresh: string;
  /** Under the status row: when the list was fetched from GitHub; the time is already formatted. */
  lastUpdated: (time: string) => string;
  empty: string;
  /** A release whose description has nothing to show. */
  noDetails: string;
  installed: string;
  preRelease: string;
  releasedOn: (date: string) => string;
  /** The row that opens the releases page. */
  allReleases: string;
  allReleasesHint: string;
};

export const en: SettingsChangelogText = {
  loading: "Loading release notes…",
  loaded: (count) => (count === 1 ? "1 release" : `${count} releases`),
  showingSaved: "Could not reach GitHub, so this is the list saved from the last time.",
  failed: "Could not load the release notes.",
  refresh: "Refresh",
  lastUpdated: (time) => `Last updated ${time}.`,
  empty: "No releases have been published yet.",
  noDetails: "No description for this release.",
  installed: "Installed",
  preRelease: "Pre-release",
  releasedOn: (date) => `Released ${date}`,
  allReleases: "All releases on GitHub",
  allReleasesHint: "Installers, checksums and the full history",
};
