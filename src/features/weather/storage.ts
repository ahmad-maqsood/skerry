import { readJson, writeJson } from "../../lib/storage.ts";
import { normalizeClockWeatherSettings, normalizeWeatherCache, type ClockWeatherSettings, type WeatherCache } from "./model.ts";

export const CLOCK_WEATHER_KEY = "skerry-clock-weather";
export const WEATHER_CACHE_KEY = "skerry-weather-cache";
export const loadClockWeatherSettings = () => normalizeClockWeatherSettings(readJson(CLOCK_WEATHER_KEY));
export const saveClockWeatherSettings = (settings: ClockWeatherSettings) => writeJson(CLOCK_WEATHER_KEY, normalizeClockWeatherSettings(settings));
export const loadWeatherCache = () => normalizeWeatherCache(readJson(WEATHER_CACHE_KEY));
export const saveWeatherCache = (cache: WeatherCache) => writeJson(WEATHER_CACHE_KEY, cache);
