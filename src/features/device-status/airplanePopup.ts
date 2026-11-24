export type AirplaneChange = "on" | "off";

/**
 * What a new reading of airplane mode changed. `previous` is the reading before it: undefined
 * until the first one is in, so the state the PC is in when the app starts is not news. Null when
 * nothing changed.
 */
export function airplaneChange(previous: boolean | undefined, on: boolean): AirplaneChange | null {
  if (previous === undefined || previous === on) return null;
  return on ? "on" : "off";
}
