export type SettingsLayoutText = {
  title: string;
  opacity: string;
  launchAtStartup: string;
  autoTuck: string;
  autoTuckHint: string;
  /** Game mode: quiet while a full-screen app (usually a game) is in front. */
  gameTitle: string;
  gameQuiet: string;
  gameQuietHint: string;
  resetToDefault: string;
};


export const en: SettingsLayoutText = {
  title: "Size & position",
  opacity: "Opacity",
  launchAtStartup: "Launch at startup",
  autoTuck: "Tuck to the edge when idle",
  autoTuckHint: "After a while without use, the collapsed island slides up to the top of the screen and shows only an edge.",
  gameTitle: "Game mode",
  gameQuiet: "Quiet in full screen",
  gameQuietHint: "While a full-screen game, video or slideshow is in front, the island doesn't open on hover, take the focus or pop up messages.",
  resetToDefault: "Reset to default",
};
