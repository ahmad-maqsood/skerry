import { readJson, removeItem, writeJson } from "../../lib/storage";
import { normalizeDismissed } from "./pluginFeed.ts";
import { normalizePopupsOff } from "./pluginPopups.ts";

/** Keys (`<plugin id>/<notification id>`) of plugin notifications the user cleared. */
export const PLUGIN_DISMISSED_KEY = "skerry-plugin-dismissed";

export function loadDismissed(): string[] {
  return normalizeDismissed(readJson(PLUGIN_DISMISSED_KEY));
}

export function saveDismissed(keys: readonly string[]): void {
  writeJson(PLUGIN_DISMISSED_KEY, keys);
}

/** Ids of the plugins whose pop-ups on the island the user switched off; every other plugin has them on. */
export const PLUGIN_POPUPS_OFF_KEY = "skerry-plugin-popups-off";

export function loadPopupsOff(): string[] {
  return normalizePopupsOff(readJson(PLUGIN_POPUPS_OFF_KEY));
}

export function savePopupsOff(ids: readonly string[]): void {
  writeJson(PLUGIN_POPUPS_OFF_KEY, ids);
}

/** The plugin the Plugins section is narrowed to; missing means all of them. */
export const PLUGIN_FILTER_KEY = "skerry-plugin-filter";

export function loadPluginFilter(): string | null {
  const value = readJson(PLUGIN_FILTER_KEY);
  return typeof value === "string" && value.length > 0 && value.length < 200 ? value : null;
}

export function savePluginFilter(pluginId: string | null): void {
  if (pluginId === null) removeItem(PLUGIN_FILTER_KEY); else writeJson(PLUGIN_FILTER_KEY, pluginId);
}
