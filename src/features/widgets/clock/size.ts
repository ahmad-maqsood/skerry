/** The clock widget's width in pixels: what Settings → Advanced → Widgets offers, and its default. */
export const CLOCK_WIDTH = { default: 560, min: 280, max: 1000 } as const;

/** The widget is laid out at its default size and scaled, so its height follows this proportion. */
const DEFAULT_HEIGHT = 230;

/** A whole number within the allowed range; anything else reads as the default. */
export function normalizeClockWidth(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return CLOCK_WIDTH.default;
  return Math.min(CLOCK_WIDTH.max, Math.max(CLOCK_WIDTH.min, Math.round(value)));
}

/** How much larger or smaller than its default layout the widget is drawn. */
export function clockScale(width: number) {
  return width / CLOCK_WIDTH.default;
}

/** The widget window's size in logical pixels for a width. */
export function clockWindowSize(width: number) {
  return { width, height: Math.round(width * DEFAULT_HEIGHT / CLOCK_WIDTH.default) };
}
