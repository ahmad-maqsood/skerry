import type { IslandPage } from "./types";

/** Which modules are switched on; an off module is hidden on the island. */
export type IslandFeatures = {
  todo: boolean;
  music: boolean;
  clipboard: boolean;
  shelf: boolean;
  qq: boolean;
  translation: boolean;
  system: boolean;
};

const PAGE_ORDER: IslandPage[] = [
  "todo",
  "music",
  "clipboard",
  "shelf",
  "qq",
  "translation",
  "system",
];

export function isPageEnabled(page: IslandPage, features: IslandFeatures): boolean {
  if (page === "settings") return true;
  return features[page] === true;
}

/** `page` when it is on, otherwise the first page that is, or null when every page is off. */
export function resolveIslandPage(page: IslandPage, features: IslandFeatures): IslandPage | null {
  if (isPageEnabled(page, features)) return page;
  return PAGE_ORDER.find((candidate) => isPageEnabled(candidate, features)) ?? null;
}

/**
 * The page the island keeps open. A clipboard opened in its own window is no island page, so a
 * remembered clipboard page moves on.
 */
export function islandPageFor(
  page: IslandPage,
  features: IslandFeatures,
  clipboardDetached: boolean,
): IslandPage | null {
  return resolveIslandPage(page, clipboardDetached ? { ...features, clipboard: false } : features);
}
