import { readJson, writeJson } from "../../lib/storage.ts";
import { normalizePixelCatSettings, type PixelCatSettings } from "./model.ts";

export const PIXEL_CAT_KEY = "skerry-pixel-cat";
export const loadPixelCatSettings = () => normalizePixelCatSettings(readJson(PIXEL_CAT_KEY));
export const savePixelCatSettings = (settings: PixelCatSettings) => writeJson(PIXEL_CAT_KEY, normalizePixelCatSettings(settings));
