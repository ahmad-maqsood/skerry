import { useCallback, useEffect, useRef, useState } from "react";
import { fetchReleaseNotes } from "./api";
import { loadReleaseNotesCache, saveReleaseNotesCache } from "./storage";
import type { ReleaseNote } from "./types";

export type ReleaseNotesState = {
  releases: ReleaseNote[];
  /** A request is out. The saved list, if any, is already shown meanwhile. */
  loading: boolean;
  /** Why the last request failed; the list shown is then the saved one. */
  error: string | null;
  refresh: () => void;
};

/** The project's releases: the saved list at once, then a fresh one from GitHub. */
export function useReleaseNotes(): ReleaseNotesState {
  const [releases, setReleases] = useState<ReleaseNote[]>(() => loadReleaseNotesCache()?.releases ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the newest request may change what is shown, whichever order the answers come in.
  const latest = useRef(0);

  const refresh = useCallback(() => {
    const request = ++latest.current;
    setLoading(true);
    setError(null);
    fetchReleaseNotes()
      .then((fetched) => {
        if (request !== latest.current) return;
        setReleases(fetched);
        saveReleaseNotesCache({ releases: fetched, fetchedAt: Date.now() });
      })
      .catch((reason: unknown) => {
        if (request !== latest.current) return;
        console.error("Failed to load release notes", reason);
        setError(typeof reason === "string" ? reason : reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (request === latest.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    return () => { latest.current += 1; };
  }, [refresh]);

  return { releases, loading, error, refresh };
}
