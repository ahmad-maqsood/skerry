import type { PluginFeed } from "./pluginFeed.ts";

/** A plugin that has something to show, for the filter on the Plugins section. */
export type FilterPlugin = { id: string; name: string };

/** Plugins with a notification or a task in the feed, by name. Plugins with nothing to show are left out. */
export function pluginsInFeed(feed: PluginFeed): FilterPlugin[] {
  const found = new Map<string, string>();
  for (const item of feed.notifications) if (!found.has(item.pluginId)) found.set(item.pluginId, item.appName);
  for (const item of feed.sessions) found.set(item.pluginId, item.pluginName);
  return [...found.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** The saved choice if it can be used: a plugin that still has something to show, else null (all plugins). */
export function activePluginFilter(chosen: string | null, plugins: readonly FilterPlugin[]): string | null {
  return chosen !== null && plugins.some((plugin) => plugin.id === chosen) ? chosen : null;
}

/** The filter is offered only when there is a choice to make: two or more plugins have something to show. */
export function offersPluginFilter(plugins: readonly FilterPlugin[]): boolean {
  return plugins.length >= 2;
}

/** The feed with only the chosen plugin's items; the whole feed when no plugin is chosen. */
export function filterFeed(feed: PluginFeed, pluginId: string | null): PluginFeed {
  if (pluginId === null) return feed;
  return {
    notifications: feed.notifications.filter((item) => item.pluginId === pluginId),
    sessions: feed.sessions.filter((item) => item.pluginId === pluginId),
  };
}
