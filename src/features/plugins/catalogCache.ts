import { readJson, writeJson } from "../../lib/storage.ts";
import type { PluginIndexEntry } from "./api";

export const PLUGIN_CATALOG_KEY = "skerry-plugin-catalog";

/** The last answer from one index source: its entries, or that it could not be read. */
export type PluginCatalog = { source: string; entries: PluginIndexEntry[]; unavailable: boolean };

/** Which index an answer came from: the saved path counts only in developer mode (service.rs). */
export function catalogSource(developerMode: boolean, indexUrl: string) {
  return developerMode && indexUrl ? indexUrl : "";
}

/** A stored answer, or null when it is missing or not in the shape the page can draw. */
export function normalizeCatalog(value: unknown): PluginCatalog | null {
  const item = value as Partial<PluginCatalog> | null | undefined;
  if (!item || typeof item.source !== "string" || typeof item.unavailable !== "boolean" || !Array.isArray(item.entries)) return null;
  const text = (name: unknown) => typeof (name as { en?: unknown } | null | undefined)?.en === "string";
  const drawable = item.entries.every((entry: Partial<PluginIndexEntry> | null) =>
    typeof entry?.id === "string" && typeof entry.version === "string" && text(entry.name) && text(entry.description));
  return drawable ? { source: item.source, entries: item.entries, unavailable: item.unavailable } : null;
}

export const loadCatalog = () => normalizeCatalog(readJson(PLUGIN_CATALOG_KEY));
export const saveCatalog = (catalog: PluginCatalog) => { writeJson(PLUGIN_CATALOG_KEY, catalog); };
