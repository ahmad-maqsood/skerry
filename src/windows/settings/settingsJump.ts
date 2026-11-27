import type { SettingsSearchTarget } from "./searchSettings.ts";

const FOUND_CLASS = "settings-found";
/** How long the found setting stays marked. */
const FOUND_MS = 1800;

const text = (element: Element | null) => element?.textContent?.trim() ?? "";

/**
 * The row or group a search result points at in the open page, or null when it is not on screen (a
 * row under a switch that is off). Rows match by title and, when the result names one, group.
 */
export function findSettingsTarget(root: ParentNode, { group, title }: Pick<SettingsSearchTarget, "group" | "title">): HTMLElement | null {
  if (title) {
    for (const row of root.querySelectorAll<HTMLElement>(".settings-row")) {
      if (text(row.querySelector(".settings-row__title")) !== title) continue;
      const rowGroup = text(row.closest(".settings-group")?.querySelector(".settings-group__title") ?? null);
      if (!group || rowGroup === group) return row;
    }
    return null;
  }
  if (!group) return null;
  for (const section of root.querySelectorAll<HTMLElement>(".settings-group")) {
    if (text(section.querySelector(".settings-group__title")) === group) return section;
  }
  return null;
}

/** Scrolls the element into the middle of the page and marks it for a moment; returns what undoes the mark. */
export function revealSettingsTarget(element: HTMLElement): () => void {
  element.scrollIntoView({ block: "center" });
  element.classList.add(FOUND_CLASS);
  const timer = window.setTimeout(() => element.classList.remove(FOUND_CLASS), FOUND_MS);
  return () => {
    window.clearTimeout(timer);
    element.classList.remove(FOUND_CLASS);
  };
}
