import { useCallback } from "react";
import { blobToBase64 } from "../../lib/blobBase64";
import { readTodoNoteImage, saveTodoNoteImage } from "./api";

/** Images pasted into the daily note: saved in the save folder, read back for the thumbnails. */
export function useTodoNoteImages({
  saveDirectory,
  date,
  onNeedsFolder,
  onFailed,
}: {
  saveDirectory: string;
  /** The day the note belongs to; it starts the image's file name. */
  date: string;
  /** Called when there is no save folder to put the image in. */
  onNeedsFolder: () => void;
  onFailed: () => void;
}) {
  // The path the note should refer to, or null when nothing was saved.
  const saveNoteImage = useCallback(async (image: Blob): Promise<string | null> => {
    const directory = saveDirectory.trim();

    if (!directory) {
      onNeedsFolder();
      return null;
    }

    try {
      return (await saveTodoNoteImage(directory, date, await blobToBase64(image))).relativePath;
    } catch (error) {
      console.error("Failed to save a pasted note image", error);
      onFailed();
      return null;
    }
  }, [date, onFailed, onNeedsFolder, saveDirectory]);

  const readNoteImage = useCallback(async (relativePath: string): Promise<string | null> => {
    const directory = saveDirectory.trim();
    return directory ? readTodoNoteImage(directory, relativePath) : null;
  }, [saveDirectory]);

  return { saveNoteImage, readNoteImage };
}
