import type { PluginNotification, PluginSession, PluginsSnapshot } from "./api.ts";

/** A plugin's notification, with the plugin that published it. */
export type FeedNotification = PluginNotification & { pluginId: string };
/** A plugin's session (a run, a task), with the plugin that published it and its name. */
export type FeedSession = PluginSession & { pluginId: string; pluginName: string };
export type PluginFeed = { notifications: FeedNotification[]; sessions: FeedSession[] };

/** Dismissed notifications are remembered by id; only the newest of them are kept. */
export const MAX_DISMISSED = 500;

/** The key a notification is remembered under once dismissed. */
export const dismissKey = (item: { pluginId: string; id: string }): string => `${item.pluginId}/${item.id}`;

/**
 * What the island shows from the plugins: every enabled plugin's notifications (newest first, minus
 * the dismissed ones) and sessions (most recently updated first).
 */
export function buildFeed(snapshot: PluginsSnapshot, dismissed: ReadonlySet<string>): PluginFeed {
  const notifications: FeedNotification[] = [];
  const sessions: FeedSession[] = [];
  for (const [pluginId, live] of Object.entries(snapshot.live)) {
    const installed = snapshot.registry.installed[pluginId];
    if (!installed?.enabled) continue;
    for (const item of live.notifications ?? []) {
      const entry = { ...item, pluginId };
      if (!dismissed.has(dismissKey(entry))) notifications.push(entry);
    }
    for (const item of live.sessions ?? []) sessions.push({ ...item, pluginId, pluginName: installed.manifest.name.en });
  }
  notifications.sort((a, b) => b.receivedAt - a.receivedAt);
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  return { notifications, sessions };
}

/** Reads the saved dismissed keys: strings only, no repeats, at most the newest [`MAX_DISMISSED`]. */
export function normalizeDismissed(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const keys = [...new Set(value.filter((key): key is string => typeof key === "string" && key.length > 0 && key.length < 500))];
  return keys.slice(-MAX_DISMISSED);
}

/** The saved list with `keys` added at the end, keeping the newest [`MAX_DISMISSED`]. */
export function addDismissed(current: readonly string[], keys: readonly string[]): string[] {
  return normalizeDismissed([...current.filter((key) => !keys.includes(key)), ...keys]);
}

/**
 * The address a plugin action asks the island to open: `{ openUrl }` with an https address and no
 * login in it. Anything else (no result, another scheme, a malformed address) opens nothing.
 */
export function openUrlFromResult(result: unknown): string | null {
  const value = typeof result === "object" && result !== null ? (result as { openUrl?: unknown }).openUrl : undefined;
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
