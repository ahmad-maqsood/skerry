export type SettingsPageErrorText = {
  /** Shown in place of a settings page that failed to draw. */
  title: string;
  /** Used when the error carries no message of its own. */
  fallbackHint: string;
  retry: string;
};

export const en: SettingsPageErrorText = {
  title: "This page could not be shown.",
  fallbackHint: "The other settings pages still work. Try again, or open another page.",
  retry: "Try again",
};
