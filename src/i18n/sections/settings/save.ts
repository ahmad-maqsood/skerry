export type SettingsSaveText = {
  title: string;
  folder: string;
  folderLabel: string;
  folderPlaceholder: string;
  saved: string;
  save: string;
  browse: string;
  browseTitle: string;
  browseFailed: string;
  fileSync: string;
  fileSyncDescription: string;
  fileSyncNeedsPath: string;
};


export const en: SettingsSaveText = {
  title: "Save location",
  folder: "Folder",
  folderLabel: "Markdown folder for task list",
  folderPlaceholder: "D:/Todos",
  saved: "Saved",
  save: "Save",
  browse: "Choose folder",
  browseTitle: "Choose a folder for the task list",
  browseFailed: "Couldn't open the folder picker",
  fileSync: "Sync file edits back to the island",
  fileSyncDescription: "When on, editing today's Markdown file updates the island's todos and daily note.",
  fileSyncNeedsPath: "Save a folder path first to enable file sync.",
};
