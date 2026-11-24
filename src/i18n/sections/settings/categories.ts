export type SettingsCategoriesText = {
  label: string;
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
  /** The file shelf's group on the Clipboard page. */
  shelf: string;
  plugins: string;
  /** The release notes of every published version. */
  changelog: string;
  about: string;
};


export const en: SettingsCategoriesText = {
  label: "Settings categories",
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
  shelf: "File shelf",
  plugins: "Plugins",
  changelog: "Changelog",
  about: "About",
};
