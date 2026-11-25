import type { ReleaseNotesCache } from "./types.ts";

/** Opening the page again within this time shows the saved list without asking GitHub. */
export const RELEASE_NOTES_FRESH_MS = 10 * 60 * 1000;
/** A saved time this far ahead of the clock cannot be trusted (the clock was changed). */
const CLOCK_SKEW_MS = 60 * 1000;

/** True when the saved list is recent enough to skip the request. An empty or undated list never is. */
export function releaseNotesAreFresh(cache: ReleaseNotesCache | null, now: number): boolean {
  if (cache === null || cache.releases.length === 0 || cache.fetchedAt <= 0) return false;
  if (cache.fetchedAt > now + CLOCK_SKEW_MS) return false;
  return now - cache.fetchedAt < RELEASE_NOTES_FRESH_MS;
}
