import type { ClipboardHistoryItem } from "./api";

/** Longest copied text the island shows; the rest is cut so one line stays readable. */
export const COPY_POPUP_MAX_CHARS = 120;

/** When the newest item in the history was copied; 0 for an empty history. */
export function newestCopiedAt(items: readonly Pick<ClipboardHistoryItem, "copiedAt">[]): number {
  return items.reduce((newest, item) => Math.max(newest, item.copiedAt), 0);
}

/**
 * The text copied after `since` (the newest copy already seen), or null. Images are left out, and
 * so is anything blank. A text copied again moves to the top with a new time, so it counts too.
 */
export function copiedTextSince(items: readonly ClipboardHistoryItem[], since: number): ClipboardHistoryItem | null {
  return items.reduce<ClipboardHistoryItem | null>((newest, item) => {
    if (item.kind !== "text" || item.copiedAt <= since || !copyPopupText(item)) return newest;
    return !newest || item.copiedAt > newest.copiedAt ? item : newest;
  }, null);
}

/** The copied text as one trimmed line, cut to COPY_POPUP_MAX_CHARS with an ellipsis. */
export function copyPopupText(item: Pick<ClipboardHistoryItem, "text" | "preview">): string {
  const line = (item.text ?? item.preview).replace(/\s+/g, " ").trim();
  return line.length > COPY_POPUP_MAX_CHARS ? `${line.slice(0, COPY_POPUP_MAX_CHARS - 1).trimEnd()}…` : line;
}
