import { readJson, writeJson } from "../../../lib/storage.ts";
import { normalizeClockWidth } from "./size.ts";

export const CLOCK_COLOR_KEY = "skerry-widget-clock-color";
export const CLOCK_INK_KEY = "skerry-widget-clock-ink";
export const CLOCK_SIZE_KEY = "skerry-widget-clock-size";

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

/** The automatic colour last shown, as `#rrggbb`, or null. A start with windows open cannot read the desktop. */
export function loadLastAutoColor() {
  const stored = readJson(CLOCK_INK_KEY);
  return typeof stored === "string" && /^#[0-9a-f]{6}$/i.test(stored) ? stored : null;
}

export const saveLastAutoColor = (color: string) => writeJson(CLOCK_INK_KEY, color);

/** The widget's width in pixels; the default until one is chosen, or when the stored value is damaged. */
export const loadClockWidth = () => normalizeClockWidth(readJson(CLOCK_SIZE_KEY));
export const saveClockWidth = (width: number) => writeJson(CLOCK_SIZE_KEY, normalizeClockWidth(width));
