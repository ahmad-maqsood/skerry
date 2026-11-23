import { invoke } from "@tauri-apps/api/core";

// Corresponds to SaveTodoMarkdownResult in src-tauri/src/system/todo_export.rs.
export type SaveTodoResult = {
  filePath: string;
};

export function saveTodoMarkdown(directory: string, date: string, content: string) {
  return invoke<SaveTodoResult>("save_todo_markdown", { directory, date, content });
}

/** Opens the day's saved markdown file in the app the system uses for `.md` files. */
export function openTodoMarkdown(directory: string, date: string) {
  return invoke<void>("open_todo_markdown", { directory, date });
}

// Corresponds to TodoMarkdownSnapshot / ConditionalTodoSaveResult in src-tauri/src/system/todo_sync.rs.
export type TodoMarkdownSnapshot = {
  filePath: string;
  version: string | null;
  modifiedAt: number | null;
  content: string | null;
};
export type ConditionalTodoSaveResult = { saved: boolean; snapshot: TodoMarkdownSnapshot };

export function readTodoMarkdown(directory: string, date: string) {
  return invoke<TodoMarkdownSnapshot>("read_todo_markdown", { directory, date });
}

export function saveTodoMarkdownIfUnchanged(directory: string, date: string, content: string, expectedVersion: string | null, recoveryContent: string | null) {
  return invoke<ConditionalTodoSaveResult>("save_todo_markdown_if_unchanged", { directory, date, content, expectedVersion, recoveryContent });
}

export function getDefaultTodoSaveDirectory() {
  return invoke<string>("get_default_todo_save_directory");
}

/** Native folder picker over the calling window; resolves to `null` when cancelled. */
export function pickFolder(initialDirectory: string, title: string) {
  return invoke<string | null>("pick_folder", { initialDirectory, title });
}
