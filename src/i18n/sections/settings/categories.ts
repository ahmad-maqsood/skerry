export type SettingsCategoriesText = {
  label: string;
  /** The search box above the page list. */
  search: {
    label: string;
    placeholder: string;
    found: (count: number) => string;
    none: string;
  };
  groups: {
    basics: string;
    features: string;
  };
  general: string;
  appearance: string;
  shortcuts: string;
  /** QQ, WeChat and Mail on one page. */
  messages: string;
  /** Mail's group on the Messages page. */
  mail: string;
  todos: string;
  music: string;
  clipboard: string;
  translation: string;
  system: string;
  /** Optional extras, such as the live wallpaper. */
  advanced: string;
  /** The file shelf's group on the Clipboard page. */
  shelf: string;
  plugins: string;
  /** The release notes of every published version. */
  changelog: string;
  about: string;
};


export const en: SettingsCategoriesText = {
  label: "Settings categories",
  search: {
    label: "Search settings",
    placeholder: "Search settings",
    found: (count) => (count === 1 ? "1 match" : `${count} matches`),
    none: "No matching settings",
  },
  groups: {
    basics: "Basics",
    features: "Features",
  },
  general: "General",
  appearance: "Appearance",
  shortcuts: "Shortcuts",
  messages: "Notifications",
  mail: "Mail",
  todos: "Todos",
  music: "Music",
  clipboard: "Clipboard & files",
  translation: "Translation",
  system: "System",
  advanced: "Advanced",
  shelf: "File shelf",
  plugins: "Plugins",
  changelog: "Changelog",
  about: "About",
};
