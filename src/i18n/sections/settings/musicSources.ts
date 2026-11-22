export type SettingsMusicSourcesText = {
  title: string;
  footer: string;
  /** Why a cover may be missing: the player does not hand it to Windows. */
  coverHint: string;
  empty: string;
  playing: string;
  open: string;
  notOpen: string;
  moveLabel: (name: string) => string;
  /** The row button that takes a player out of the order, for players the user never uses. */
  archive: string;
  /** The row button in the archive that puts a player back at the end of the order. */
  restore: string;
  archivedTitle: string;
  archivedHint: string;
};


export const en: SettingsMusicSourcesText = {
  title: "Player order",
  footer: "When several players are playing, the island shows the first; when none is, the first one that is open. Drag to reorder.",
  coverHint: "No cover art? Turn on SMTC (System Media Transport Controls) in the player's own settings.",
  empty: "No players found yet. Play a song and it shows up here.",
  playing: "Playing",
  open: "Open",
  notOpen: "Not open",
  moveLabel: (name) => `Reorder "${name}": drag, or press the up and down arrow keys`,
  archive: "Archive",
  restore: "Restore",
  archivedTitle: "Archived",
  archivedHint: "Archived players leave the order above and the island no longer follows them. Restore one to put it back at the end.",
};
