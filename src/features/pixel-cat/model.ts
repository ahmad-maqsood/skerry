export type PixelCatSettings = {
  enabled: boolean;
  /** Keep the cat on the island while a song plays; off hides it until the music stops. */
  whilePlaying: boolean;
};

/** Room the cat walks in, in px before island scaling; the island grows by this much while it is on. */
export const PIXEL_CAT_LANE_WIDTH = 112;
/** The widest collapsed island the native window accepts (geometry.rs). */
const MAX_ISLAND_WIDTH = 480;
/** Gap the bar puts between the cat's lane and its neighbours. */
const LANE_GAP = 8;

/**
 * What a fresh install starts with: the cat is on (and the time off, see weather/model.ts).
 * Settings saved by an older version are not touched: a missing key still reads as off.
 */
export const FIRST_LAUNCH_PIXEL_CAT: PixelCatSettings = { enabled: true, whilePlaying: true };

export function normalizePixelCatSettings(value: unknown): PixelCatSettings {
  const item = value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { enabled: item.enabled === true, whilePlaying: item.whilePlaying !== false };
}

/** Whether the cat is on the island now: switched on, and not hidden because a song is playing. */
export function pixelCatShown(settings: PixelCatSettings, songPlaying: boolean) {
  return settings.enabled && (settings.whilePlaying || !songPlaying);
}

/**
 * The collapsed width with the cat's lane added to `width`, kept within what the window accepts and
 * never below `minimum`, the room the measured status icons need (useCollapsedStatusWidth).
 */
export function pixelCatWidth(width: number, minimum = 0) {
  return Math.min(MAX_ISLAND_WIDTH, Math.max(minimum, Math.ceil(width + PIXEL_CAT_LANE_WIDTH + LANE_GAP)));
}

/**
 * The cat takes the clock's place on the bar, so the clock's slot has to stay on the island even
 * when Settings → Appearance moved the clock off it.
 */
export function slotsHiddenWithCat<T extends string>(hidden: readonly T[], catOn: boolean): readonly T[] {
  return catOn ? hidden.filter((slot) => slot !== "clock") : hidden;
}

/**
 * The cat's lane is a fixed block, so any status icon (files, music) arranged before the clock's
 * slot would sit in the middle of the bar with the empty lane to its right. With the cat on, its
 * lane moves up to just after the text, and those icons gather at the right edge instead.
 * A clock slot the user placed before the text, or a bar with no text, is left as arranged.
 */
export function catBesideText<T extends string>(layout: readonly T[], clockSlot: T, textSlot: T): readonly T[] {
  const text = layout.indexOf(textSlot);
  const clock = layout.indexOf(clockSlot);
  if (text < 0 || clock < 0 || clock < text) return layout;
  return [...layout.slice(0, text + 1), clockSlot, ...layout.slice(text + 1).filter((slot) => slot !== clockSlot)];
}
