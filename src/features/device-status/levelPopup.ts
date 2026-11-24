/**
 * The new level (0 to 100) when a reading of the volume or brightness moved by at least `minStep`
 * from the one before it, else null. `previous` is undefined until the first reading is in, so the
 * level the PC is at when the app starts (or when polling resumes) is not news.
 */
export function levelChange(previous: number | undefined, level: number, minStep = 1): number | null {
  if (previous === undefined) return null;
  return Math.abs(level - previous) >= minStep ? level : null;
}
