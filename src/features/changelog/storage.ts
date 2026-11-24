import { readJson, writeJson } from "../../lib/storage.ts";
import type { ReleaseNote, ReleaseNotesCache } from "./types.ts";

export const CHANGELOG_CACHE_KEY = "skerry-changelog-cache";

function normalizeRelease(value: unknown): ReleaseNote | null {
  if (typeof value !== "object" || value === null) return null;
  const release = value as Record<string, unknown>;
  if (typeof release.tag !== "string" || release.tag === "") return null;
  const text = (field: unknown) => (typeof field === "string" ? field : "");
  return {
    tag: release.tag,
    name: text(release.name) || release.tag,
    body: text(release.body),
    publishedAt: text(release.publishedAt),
    url: text(release.url),
    prerelease: release.prerelease === true,
  };
}

/** Missing, damaged or foreign data gives no cache; entries that are not releases are dropped. */
export function normalizeReleaseNotesCache(stored: unknown): ReleaseNotesCache | null {
  if (typeof stored !== "object" || stored === null) return null;
  const value = stored as Record<string, unknown>;
  if (!Array.isArray(value.releases)) return null;
  const releases = value.releases.map(normalizeRelease).filter((release): release is ReleaseNote => release !== null);
  const fetchedAt = typeof value.fetchedAt === "number" && Number.isFinite(value.fetchedAt) ? value.fetchedAt : 0;
  return { releases, fetchedAt };
}

export const loadReleaseNotesCache = () => normalizeReleaseNotesCache(readJson(CHANGELOG_CACHE_KEY));
export const saveReleaseNotesCache = (cache: ReleaseNotesCache) => writeJson(CHANGELOG_CACHE_KEY, cache);
