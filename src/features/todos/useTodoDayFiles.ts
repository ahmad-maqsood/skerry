import { useCallback } from "react";
import { listTodoMarkdownFiles, openTodoFolder, openTodoMarkdown, type TodoMarkdownFileEntry } from "./api";

/** The days saved as markdown files: opening a saved day, listing them, opening their folder. */
export function useTodoDayFiles({
  saveDirectory,
  onNeedsFolder,
  onFailed,
}: {
  saveDirectory: string;
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

  // The days saved in the folder, newest first, or null while no folder is chosen.
  const listDayFiles = useCallback(async (): Promise<TodoMarkdownFileEntry[] | null> => {
    const directory = saveDirectory.trim();
    return directory ? listTodoMarkdownFiles(directory) : null;
  }, [saveDirectory]);

  const openFolder = useCallback(async () => {
    const directory = saveDirectory.trim();

    if (!directory) {
      onNeedsFolder();
      return;
    }

    try {
      await openTodoFolder(directory);
    } catch (error) {
      console.error("Failed to open the todo save folder", error);
      onFailed();
    }
  }, [onFailed, onNeedsFolder, saveDirectory]);

  return { openDayFile, listDayFiles, openFolder };
}
