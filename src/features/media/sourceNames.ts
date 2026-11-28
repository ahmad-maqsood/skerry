import { readJson, writeJson } from "../../lib/storage.ts";

/** Names the user gave players, by the player's id (the AppUserModelId Windows reports). */
export const MEDIA_SOURCE_NAMES_KEY = "skerry-media-source-names";
export type MediaSourceNames = Record<string, string>;

const MAX_NAMES = 50;
export const MAX_SOURCE_NAME_LENGTH = 32;

/** Keeps only non-empty text names, trimmed and cut to length; anything else in storage is ignored. */
export function normalizeSourceNames(value: unknown): MediaSourceNames {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const names: MediaSourceNames = {};
  for (const [id, name] of Object.entries(value)) {
    if (Object.keys(names).length >= MAX_NAMES) break;
    if (typeof name !== "string") continue;
    const trimmed = name.trim().slice(0, MAX_SOURCE_NAME_LENGTH).trim();
    if (id && trimmed) names[id] = trimmed;
  }
  return names;
}

/** `names` with `id` named `name`; an empty name takes the id's name away again. */
export function withSourceName(names: MediaSourceNames, id: string, name: string): MediaSourceNames {
  const { [id]: _removed, ...rest } = names;
  return normalizeSourceNames({ ...rest, [id]: name });
}

/** What to call a player: the user's name for it, else the app's own label, else its raw id. */
export function sourceDisplayName(names: MediaSourceNames, id: string | null, label: string | null | undefined): string {
  return (id ? names[id] : undefined) || label || id || "";
}

export const loadSourceNames = () => normalizeSourceNames(readJson(MEDIA_SOURCE_NAMES_KEY));
export const saveSourceNames = (names: MediaSourceNames) => writeJson(MEDIA_SOURCE_NAMES_KEY, normalizeSourceNames(names));
