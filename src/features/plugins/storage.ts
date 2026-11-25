import { readJson, writeJson } from "../../lib/storage";
import { normalizeDismissed } from "./pluginFeed.ts";

/** Keys (`<plugin id>/<notification id>`) of plugin notifications the user cleared. */
export const PLUGIN_DISMISSED_KEY = "skerry-plugin-dismissed";

export function loadDismissed(): string[] {
  return normalizeDismissed(readJson(PLUGIN_DISMISSED_KEY));
}

export function saveDismissed(keys: readonly string[]): void {
  writeJson(PLUGIN_DISMISSED_KEY, keys);
}
