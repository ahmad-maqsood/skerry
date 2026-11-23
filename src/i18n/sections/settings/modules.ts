export type SettingsModulesText = {
  title: string;
  hint: string;
  todo: string;
  music: string;
  mail: string;
  shelf: string;
  translation: string;
  clipboard: string;
  system: string;
  /** The "Island tabs" card on the General page: one switch per tab of the expanded island. */
  tabsTitle: string;
  tabsHint: string;
  tabsLastOne: string;
  tabTodo: string;
  tabMusic: string;
  tabClipboard: string;
  tabShelf: string;
  tabMessages: string;
  tabTranslation: string;
  tabSystem: string;
};


export const en: SettingsModulesText = {
  title: "Module",
  hint: "When off, the island hides this module and stops its background work. Your data is kept.",
  todo: "Enable todos",
  music: "Enable music controls",
  mail: "Enable mail",
  shelf: "Enable the file shelf",
  translation: "Enable quick translation",
  clipboard: "Enable clipboard history",
  system: "Enable system monitor",
  tabsTitle: "Island tabs",
  tabsHint: "Choose which tabs the expanded island shows. A tab that is off is hidden and its module stops its background work; your data is kept.",
  tabsLastOne: "At least one tab has to stay on, so the last one cannot be switched off.",
  tabTodo: "Todos",
  tabMusic: "Music",
  tabClipboard: "Clipboard history",
  tabShelf: "File shelf",
  tabMessages: "Messages",
  tabTranslation: "Quick translation",
  tabSystem: "System monitor",
};
