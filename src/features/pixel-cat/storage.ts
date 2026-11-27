import { readJson, writeJson } from "../../lib/storage.ts";
import { isFirstLaunch } from "../onboarding/firstLaunch.ts";
import { FIRST_LAUNCH_PIXEL_CAT, normalizePixelCatSettings, type PixelCatSettings } from "./model.ts";

export const PIXEL_CAT_KEY = "skerry-pixel-cat";
export const savePixelCatSettings = (settings: PixelCatSettings) => writeJson(PIXEL_CAT_KEY, normalizePixelCatSettings(settings));

/**
 * Read on a fresh install, nothing is saved yet: the cat starts on. The choice is written down
 * right away so the settings window, which opens later and no longer sees a first launch, reads
 * the same value as the island. Older installs without the key keep the cat off.
 */
export function loadPixelCatSettings() {
  const stored = readJson(PIXEL_CAT_KEY);
  if (stored === undefined && isFirstLaunch()) {
    savePixelCatSettings(FIRST_LAUNCH_PIXEL_CAT);
    return FIRST_LAUNCH_PIXEL_CAT;
  }
  return normalizePixelCatSettings(stored);
}
