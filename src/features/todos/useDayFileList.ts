import { useEffect, useState } from "react";
import type { TodoMarkdownFileEntry } from "./api";

export type DayFileList =
  | { status: "loading" }
  | { status: "no-folder" }
  | { status: "error" }
  | { status: "ready"; files: TodoMarkdownFileEntry[] };

/** The saved days, read once when the component using this mounts; `load` resolves null with no folder. */
export function useDayFileList(load: () => Promise<TodoMarkdownFileEntry[] | null>) {
  const [list, setList] = useState<DayFileList>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    load()
      .then((files) => {
        if (!cancelled) setList(files ? { status: "ready", files } : { status: "no-folder" });
      })
      .catch((error: unknown) => {
        console.error("Failed to list the saved todo markdown files", error);
        if (!cancelled) setList({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [load]);

  return list;
}
