import { useCallback, useEffect, useState } from "react";
import { MEDIA_SOURCE_NAMES_KEY, loadSourceNames, saveSourceNames, withSourceName } from "./sourceNames";

/** The user's own names for players, kept in step between the island and the settings window. */
export function useSourceNames() {
  const [names, setNames] = useState(loadSourceNames);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== MEDIA_SOURCE_NAMES_KEY) return;
      const stored = loadSourceNames();
      setNames((current) => (JSON.stringify(current) === JSON.stringify(stored) ? current : stored));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const next = withSourceName(names, id, name);
    if (JSON.stringify(next) === JSON.stringify(names)) return;
    setNames(next);
    saveSourceNames(next);
  }, [names]);

  return { names, rename };
}
