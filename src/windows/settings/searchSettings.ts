import type { SettingsCategory } from "./categories.ts";

/** One thing the search can open: a group heading (no `title`) or a setting row, on a page. */
export type SettingsSearchEntry = {
  page: SettingsCategory;
  group?: string;
  title?: string;
  /** Only shown while another switch is on, so the page opens without scrolling to it. */
  conditional?: boolean;
};

/** Where a search result leads: the page, and the group or row to scroll to (none: the page's top). */
export type SettingsSearchTarget = { page: SettingsCategory; group?: string; title?: string };

export type SettingsSearchResult = {
  key: string;
  /** What to show: the row's title, the group's heading or the page's name. */
  label: string;
  /** Where it is: the page's name, then the group's heading. */
  where: string;
  target: SettingsSearchTarget;
};

/** How many results the list shows; the search is for jumping, not for browsing. */
export const SEARCH_RESULT_LIMIT = 8;

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);

/** 0 when the label starts with the first word typed, 1 when it holds all of them, 2 when only the page or group does. */
function rank(label: string, context: string, tokens: readonly string[]): number | null {
  const text = label.toLowerCase();
  const around = `${text} ${context.toLowerCase()}`;
  if (!tokens.every((token) => around.includes(token))) return null;
  if (text.startsWith(tokens[0])) return 0;
  return tokens.every((token) => text.includes(token)) ? 1 : 2;
}

/**
 * The pages, groups and settings whose name holds every word typed (any order, any case), best match
 * first: a name starting with the first word, then names holding all words, then those that only
 * match through their page or group (`pages` names each page as the sidebar shows it).
 */
export function searchSettings(
  index: readonly SettingsSearchEntry[],
  pages: readonly { page: SettingsCategory; label: string }[],
  query: string,
  limit = SEARCH_RESULT_LIMIT,
): SettingsSearchResult[] {
  const tokens = words(query);
  if (tokens.length === 0) return [];
  const pageLabel = new Map(pages.map((entry) => [entry.page, entry.label]));
  const found: { rank: number; order: number; result: SettingsSearchResult }[] = [];
  const add = (score: number | null, result: SettingsSearchResult) => {
    if (score !== null) found.push({ rank: score, order: found.length, result });
  };
  for (const { page, label } of pages) {
    add(rank(label, "", tokens), { key: page, label, where: "", target: { page } });
  }
  for (const entry of index) {
    const where = pageLabel.get(entry.page);
    if (where === undefined) continue;
    const label = entry.title ?? entry.group;
    if (!label) continue;
    const place = entry.title && entry.group ? `${where} › ${entry.group}` : where;
    add(rank(label, `${entry.group ?? ""} ${where}`, tokens), {
      key: `${entry.page}/${entry.group ?? ""}/${entry.title ?? ""}`,
      label,
      where: place,
      target: { page: entry.page, group: entry.group, title: entry.title },
    });
  }
  return found.sort((a, b) => a.rank - b.rank || a.order - b.order).slice(0, limit).map((item) => item.result);
}
