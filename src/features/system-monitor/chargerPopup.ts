export type ChargerChange = "plugged" | "unplugged";

/**
 * What a new reading of "is the charger connected" changed. `previous` is the reading before it:
 * undefined until the first one is in, so a charger that is already connected (or not) when the
 * app starts is not news. Null when nothing changed.
 */
export function chargerChange(previous: boolean | undefined, pluggedIn: boolean): ChargerChange | null {
  if (previous === undefined || previous === pluggedIn) return null;
  return pluggedIn ? "plugged" : "unplugged";
}
