export type CapsLockChange = "on" | "off";

/**
 * What a new reading of Caps Lock changed. `previous` is the reading before it: undefined until
 * the first one is in, so the state the keyboard is in when the app starts is not news. Null when
 * nothing changed.
 */
export function capsLockChange(previous: boolean | undefined, on: boolean): CapsLockChange | null {
  if (previous === undefined || previous === on) return null;
  return on ? "on" : "off";
}
