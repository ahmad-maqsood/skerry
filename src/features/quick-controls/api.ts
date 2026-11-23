import { invoke } from "@tauri-apps/api/core";

// get_system_volume and set_system_volume in src-tauri/src/media_control/mod.rs: the level is 0.0 to 1.0.
export function getSystemVolume(): Promise<number> {
  return invoke<number>("get_system_volume");
}

/** Sets the system volume and resolves to the level now in effect. */
export function setSystemVolume(level: number): Promise<number> {
  return invoke<number>("set_system_volume", { level });
}

// get_brightness and set_brightness in src-tauri/src/brightness/mod.rs: a percentage, or null on a
// display that does not report one (a desktop PC, an external monitor).
export function getBrightness(): Promise<number | null> {
  return invoke<number | null>("get_brightness");
}

export function setBrightness(percent: number): Promise<void> {
  return invoke<void>("set_brightness", { percent });
}
