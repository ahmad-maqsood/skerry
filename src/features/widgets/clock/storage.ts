import { readJson, writeJson } from "../../../lib/storage.ts";

export const CLOCK_COLOR_KEY = "skerry-widget-clock-color";

/** "auto" follows what is behind the widget; "custom" draws it in `color`, which is kept while on auto. */
export type ClockColorSettings = { mode: "auto" | "custom"; color: string };

export const DEFAULT_CLOCK_COLOR: ClockColorSettings = { mode: "auto", color: "#FFFFFF" };

/** Anything missing or damaged reads as the default, field by field. */
export function normalizeClockColor(value: unknown): ClockColorSettings {
  const stored = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    mode: stored.mode === "custom" ? "custom" : "auto",
    color: typeof stored.color === "string" && /^#[0-9a-f]{6}$/i.test(stored.color)
      ? stored.color.toUpperCase()
      : DEFAULT_CLOCK_COLOR.color,
  };
}

export const loadClockColor = () => normalizeClockColor(readJson(CLOCK_COLOR_KEY));
export const saveClockColor = (settings: ClockColorSettings) => writeJson(CLOCK_COLOR_KEY, normalizeClockColor(settings));
