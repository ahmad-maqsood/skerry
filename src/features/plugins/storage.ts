import { readJson, writeJson } from "../../lib/storage";
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
