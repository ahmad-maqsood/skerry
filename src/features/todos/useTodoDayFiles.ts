import { useCallback } from "react";
import { listTodoMarkdownFiles, openTodoMarkdown, type TodoMarkdownFileEntry } from "./api";
import type { TodoItem } from "./types";

/** The days saved as markdown files: opening today's or an earlier one, and listing them. */
export function useTodoDayFiles({
  saveDirectory,
  date,
  todos,
  dailyNote,
  saveTodosToDisk,
  onNeedsFolder,
  onFailed,
}: {
  saveDirectory: string;
  /** The list's own day. */
  date: string;
  todos: TodoItem[];
  dailyNote: string;
  saveTodosToDisk: (date: string, todos: TodoItem[], dailyNote: string) => Promise<unknown>;
  /** Called when there is no save folder to read from. */
  onNeedsFolder: () => void;
  onFailed: () => void;
}) {
  // Opens a saved day in the app the system uses for markdown files.
  const openDayFile = useCallback(async (day: string) => {
    const directory = saveDirectory.trim();

    if (!directory) {
      onNeedsFolder();
      return;
    }

    try {
      await openTodoMarkdown(directory, day);
    } catch (error) {
      console.error("Failed to open todo markdown", error);
      onFailed();
    }
  }, [onFailed, onNeedsFolder, saveDirectory]);

  // Saves first, so the file exists and holds what is written here, then opens it.
  const openTodayFile = useCallback(async () => {
    if (saveDirectory.trim()) {
      try {
        await saveTodosToDisk(date, todos, dailyNote);
      } catch (error) {
        // An earlier save may still have left a file to open.
        console.error("Failed to save todo markdown before opening it", error);
      }
    }

    await openDayFile(date);
  }, [dailyNote, date, openDayFile, saveDirectory, saveTodosToDisk, todos]);

  // The days saved in the folder, newest first, or null while no folder is chosen.
  const listDayFiles = useCallback(async (): Promise<TodoMarkdownFileEntry[] | null> => {
    const directory = saveDirectory.trim();
    return directory ? listTodoMarkdownFiles(directory) : null;
  }, [saveDirectory]);

  return { openTodayFile, openDayFile, listDayFiles };
}
