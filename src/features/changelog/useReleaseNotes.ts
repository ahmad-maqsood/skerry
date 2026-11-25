import { useCallback, useEffect, useRef, useState } from "react";
import { fetchReleaseNotes } from "./api";
import { releaseNotesAreFresh } from "./freshness";
import { loadReleaseNotesCache, saveReleaseNotesCache } from "./storage";
import type { ReleaseNote } from "./types";

export type ReleaseNotesState = {
  releases: ReleaseNote[];
  /** A request is out. The saved list, if any, is already shown meanwhile. */
  loading: boolean;
  /** Why the last request failed; the list shown is then the saved one. */
  error: string | null;
  /** When the list shown was fetched from GitHub (ms since the epoch); 0 when there is no list. */
  fetchedAt: number;
  refresh: () => void;
};

/**
 * The project's releases: the saved list at once, then a fresh one from GitHub. A list saved in the
 * last few minutes is shown without a request; Refresh always asks.
 */
export function useReleaseNotes(): ReleaseNotesState {
  const [saved] = useState(loadReleaseNotesCache);
  const [startFresh] = useState(() => releaseNotesAreFresh(saved, Date.now()));
  const [releases, setReleases] = useState<ReleaseNote[]>(() => saved?.releases ?? []);
  const [fetchedAt, setFetchedAt] = useState(() => saved?.fetchedAt ?? 0);
  const [loading, setLoading] = useState(!startFresh);
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
        const now = Date.now();
        setReleases(fetched);
        setFetchedAt(now);
        saveReleaseNotesCache({ releases: fetched, fetchedAt: now });
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
    if (!startFresh) refresh();
    return () => { latest.current += 1; };
  }, [refresh, startFresh]);

  return { releases, loading, error, fetchedAt, refresh };
}
