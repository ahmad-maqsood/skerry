export type IslandText = {
  appName: string;
  focusing: (taskTitle: string) => string;
  pendingTodos: (count: number) => string;
  openMusic: string;
  collapse: string;
  collapseIsland: string;
  minimizeToTray: string;
  tuckToTop: string;
  resetPosition: string;
  resetPositionLabel: string;
  /** The settings button while its red dot leads to the community group in About. */
  settingsWithNews: string;
  editor: string;
  todoList: string;
  todoListWithUpdate: string;
  music: string;
  clipboardHistory: string;
  shelf: string;
  /** Short page names in the tips above the header dots. */
  pageNames: { todo: string; music: string; clipboard: string; shelf: string; translation: string; system: string };
  calendar: string;
  shelfCount: (count: number) => string;
  layoutEditor: string;
};


export const en: IslandText = {
  appName: "Skerry",
  focusing: (taskTitle) => `Focusing: ${taskTitle}`,
  pendingTodos: (count) => (count === 1 ? "1 todo left" : `${count} todos left`),
  openMusic: "Open music controls",
  collapse: "Collapse",
  collapseIsland: "Collapse island",
  minimizeToTray: "Minimize to tray",
  tuckToTop: "Tuck to top edge",
  resetPosition: "Reset",
  resetPositionLabel: "Reset island to the top center of the primary screen",
  settingsWithNews: "Settings (something new in About)",
  editor: "Island editor",
  todoList: "Tasks",
  todoListWithUpdate: "Tasks (update available)",
  music: "Music",
  clipboardHistory: "Clipboard history",
  shelf: "File shelf",
  pageNames: { todo: "Todo", music: "Music", clipboard: "Clipboard", shelf: "File shelf", translation: "Translate", system: "System" },
  calendar: "Calendar",
  shelfCount: (count) => (count === 1 ? "1 file on the shelf" : `${count} files on the shelf`),
  layoutEditor: "Layout editor",
};
