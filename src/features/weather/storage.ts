import { readJson, writeJson } from "../../lib/storage.ts";
import { isFirstLaunch } from "../onboarding/firstLaunch.ts";
import { firstLaunchClockWeatherSettings, normalizeClockWeatherSettings, normalizeWeatherCache, type ClockWeatherSettings, type WeatherCache } from "./model.ts";

export const CLOCK_WEATHER_KEY = "skerry-clock-weather";
export const WEATHER_CACHE_KEY = "skerry-weather-cache";
export const saveClockWeatherSettings = (settings: ClockWeatherSettings) => writeJson(CLOCK_WEATHER_KEY, normalizeClockWeatherSettings(settings));

/**
 * Read on a fresh install, nothing is saved yet: the time starts off (the pixel cat takes its
 * place). Written down right away so every window reads the same value. Older installs without
 * the key keep the time on.
 */
export function loadClockWeatherSettings() {
  const stored = readJson(CLOCK_WEATHER_KEY);
  if (stored === undefined && isFirstLaunch()) {
    const seeded = firstLaunchClockWeatherSettings();
    saveClockWeatherSettings(seeded);
    return seeded;
  }
  return normalizeClockWeatherSettings(stored);
}
export const loadWeatherCache = () => normalizeWeatherCache(readJson(WEATHER_CACHE_KEY));
export const saveWeatherCache = (cache: WeatherCache) => writeJson(WEATHER_CACHE_KEY, cache);
