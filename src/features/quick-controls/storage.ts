import { readJson, writeJson } from "../../lib/storage.ts";

export const QUICK_CONTROLS_LAST_KEY = "skerry-quick-controls-last";

/** The last volume and brightness readings, so the sliders can show at once after a restart. */
export type LastReadings = { volume: number | null; brightness: number | null };

const percentOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : null;

export function normalizeLastReadings(raw: unknown): LastReadings {
  if (typeof raw !== "object" || raw === null) return { volume: null, brightness: null };
  const record = raw as Record<string, unknown>;
  return { volume: percentOrNull(record.volume), brightness: percentOrNull(record.brightness) };
}

export function loadLastReadings(): LastReadings {
  return normalizeLastReadings(readJson(QUICK_CONTROLS_LAST_KEY));
}

export function saveLastReadings(readings: LastReadings): void {
  writeJson(QUICK_CONTROLS_LAST_KEY, normalizeLastReadings(readings));
}
