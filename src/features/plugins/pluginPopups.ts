import { dismissKey, type FeedNotification } from "./pluginFeed.ts";

/** Reads the saved ids of plugins whose pop-ups are off: strings only, no repeats. A plugin not listed has them on. */
export function normalizePopupsOff(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item !== ""))];
}

/** The list of plugins with pop-ups off after one plugin's pop-ups are switched on or off. */
export function withPluginPopup(off: readonly string[], pluginId: string, on: boolean): string[] {
  const rest = off.filter((id) => id !== pluginId);
  return on ? rest : [...rest, pluginId];
}

/**
 * The pop-up for what the plugins have published since the last look: at most one, the newest of
 * the notifications not seen before (the others are on the Notifications page). A notification
 * counts as seen once looked at, so switching a plugin's pop-ups on later does not bring old ones
 * back. Nothing pops up for a plugin whose pop-ups are off, or for a notification older than
 * `startedAt`: when a plugin starts it lists what it already knows, which is not news.
 */
export function nextPluginPopup(
  seen: ReadonlySet<string>,
  notifications: readonly FeedNotification[],
  off: ReadonlySet<string>,
  startedAt: number,
): { popup: FeedNotification | null; seen: Set<string> } {
  const nextSeen = new Set(seen);
  let popup: FeedNotification | null = null;
  for (const item of notifications) {
    const key = dismissKey(item);
    if (nextSeen.has(key)) continue;
    nextSeen.add(key);
    if (off.has(item.pluginId) || item.receivedAt < startedAt) continue;
    if (!popup || item.receivedAt > popup.receivedAt) popup = item;
  }
  return { popup, seen: nextSeen };
}
