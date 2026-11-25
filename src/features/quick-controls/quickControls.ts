/** Mirrors MIN_PERCENT in src-tauri/src/brightness/mod.rs: 0 turns some panels fully dark. */
export const MIN_BRIGHTNESS_PERCENT = 5;

/** How long a slider's moves are gathered before the newest value is sent. */
export const VOLUME_DELAY_MS = 60;
export const BRIGHTNESS_DELAY_MS = 60;

/** A whole percentage from `min` to 100; anything that is not a number becomes `min`. */
export function clampPercent(value: number, min = 0): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(100, Math.max(min, Math.round(value)));
}

/** The slider position for a system volume level of 0.0 to 1.0. */
export function volumeToPercent(level: number): number {
  return clampPercent(level * 100);
}

/** The system volume level, 0.0 to 1.0, for a slider position. */
export function percentToVolume(percent: number): number {
  return clampPercent(percent) / 100;
}

/** A brightness reading as a slider position; null (no brightness on this display) stays null. */
export function brightnessToPercent(reading: number | null): number | null {
  return reading === null ? null : clampPercent(reading, MIN_BRIGHTNESS_PERCENT);
}
