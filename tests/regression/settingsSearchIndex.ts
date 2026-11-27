// settings.html: the search index (src/windows/settings/searchIndex.ts) matches what each page shows.
import { SETTINGS_SEARCH_INDEX } from "../../src/windows/settings/searchIndex";

/** Pages whose rows are not fixed copy: the plugin store and the release notes follow data and the release flag. */
const NOT_INDEXED_PAGES = new Set(["plugins", "changelog"]);
/** Rows built from the user's own data in these mocks (apps, players, presets), so they cannot be listed. */
const DATA_ROWS = new Set(["WhatsApp", "Telegram", "Spotify", "Google Chrome", "No appearance presets saved yet."]);

const text = (element: Element | null) => element?.textContent?.trim() ?? "";
const key = (group: string, title: string) => `${group}|${title}`;

/** Every group heading ("group|") and row ("group|title") on the open page. */
function renderedKeys(panel: HTMLElement) {
  const keys = new Set<string>();
  for (const group of panel.querySelectorAll<HTMLElement>(".settings-group")) {
    const heading = text(group.querySelector(".settings-group__title"));
    if (heading) keys.add(key(heading, ""));
  }
  for (const row of panel.querySelectorAll<HTMLElement>(".settings-row")) {
    const title = text(row.querySelector(".settings-row__title"));
    if (title && !DATA_ROWS.has(title)) keys.add(key(text(row.closest(".settings-group")?.querySelector(".settings-group__title") ?? null), title));
  }
  return keys;
}

export function checkSearchIndex(category: string, panel: HTMLElement, check: (condition: unknown, message: string) => void) {
  if (NOT_INDEXED_PAGES.has(category)) return;
  const entries = SETTINGS_SEARCH_INDEX.filter((entry) => entry.page === category);
  const indexed = new Set(entries.map((entry) => key(entry.group ?? "", entry.title ?? "")));
  const rendered = renderedKeys(panel);
  const unlisted = [...rendered].filter((item) => !indexed.has(item));
  check(unlisted.length === 0, `${category}: the search index lists every group and setting on the page (add to searchIndex.ts: ${unlisted.join(", ")})`);
  const gone = entries.filter((entry) => !entry.conditional && !rendered.has(key(entry.group ?? "", entry.title ?? "")));
  check(gone.length === 0, `${category}: the search index lists nothing the page no longer shows (remove or mark conditional in searchIndex.ts: ${gone.map((entry) => `${entry.group ?? ""}|${entry.title ?? ""}`).join(", ")})`);
}
