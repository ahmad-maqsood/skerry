export type SettingsShortcutsText = {
  globalHint: string;
  openTranslation: string;
  translationShortcutEnabled: string;
  taken: (shortcut: string, owner: string) => string;
  /** Windows refused the keys; `kept` is the shortcut still in use, when there is one. */
  registerFailed: (shortcut: string, kept?: string) => string;
  reset: (shortcut: string) => string;
  /** Another program's global hotkey took the keys while recording. */
  takenElsewhere: string;
  music: { playPause: string; previous: string; next: string };
  clear: string;
  unassigned: string;
};


export const en: SettingsShortcutsText = {
  music: { playPause: "Play / pause", previous: "Previous track", next: "Next track" },
  clear: "Clear shortcut",
  unassigned: "Not set",
  globalHint: "These work in any program. Click a button, then press a new key combination; Esc cancels.",
  openTranslation: "Open quick translation",
  translationShortcutEnabled: "Enable translation shortcut",
  taken: (shortcut, owner) => `${shortcut} is already used by "${owner}". Choose another.`,
  registerFailed: (shortcut, kept) =>
    `${shortcut} could not be set as a global shortcut; another program may be using it. Choose another.${kept ? ` Still using ${kept}.` : ""}`,
  reset: (shortcut) => `Reset to default (${shortcut})`,
  takenElsewhere: "That combination belongs to another program (pressing it switched to another window, such as a music player or chat app), so it was not recorded. Choose another.",
};
