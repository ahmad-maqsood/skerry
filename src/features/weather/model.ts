export type WeatherLocation = { name: string; latitude: number; longitude: number };
export type ClockHourFormat = "auto" | "12h" | "24h";
export type ClockWeatherSettings = {
  showClock: boolean;
  showWeather: boolean;
  location: WeatherLocation | null;
  hourFormat: ClockHourFormat;
  showSeconds: boolean;
  showDateOnHover: boolean;
};
export type WeatherReading = { temperature: number; code: number; observedAt: number; fetchedAt: number };
export type WeatherCache = WeatherReading & { latitude: number; longitude: number };
export type WeatherCondition = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "freezingRain" | "snow" | "showers" | "snowShowers" | "thunderstorm" | "unknown";

export const WEATHER_REFRESH_MS = 30 * 60_000;
export const WEATHER_MAX_AGE_MS = 3 * 60 * 60_000;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}
export function normalizeWeatherLocation(value: unknown): WeatherLocation | null {
  const item = record(value);
  if (typeof item.name !== "string" || !item.name.trim() || !validCoordinates(item.latitude, item.longitude)) return null;
  return { name: item.name.trim().slice(0, 200), latitude: item.latitude as number, longitude: item.longitude as number };
}
export function normalizeClockWeatherSettings(value: unknown): ClockWeatherSettings {
  const item = record(value);
  const hourFormat: ClockHourFormat = item.hourFormat === "12h" || item.hourFormat === "24h" ? item.hourFormat : "auto";
  return {
    showClock: item.showClock !== false,
    showWeather: item.showWeather === true,
    location: normalizeWeatherLocation(item.location),
    hourFormat,
    showSeconds: item.showSeconds === true,
    showDateOnHover: item.showDateOnHover !== false,
  };
}
export function normalizeWeatherCache(value: unknown): WeatherCache | null {
  const item = record(value);
  if (!validCoordinates(item.latitude, item.longitude)
    || typeof item.temperature !== "number" || !Number.isFinite(item.temperature) || Math.abs(item.temperature) > 150
    || typeof item.code !== "number" || !Number.isInteger(item.code) || item.code < 0 || item.code > 255
    || typeof item.observedAt !== "number" || !Number.isFinite(item.observedAt) || item.observedAt <= 0
    || typeof item.fetchedAt !== "number" || !Number.isFinite(item.fetchedAt) || item.fetchedAt <= 0) return null;
  return { latitude: item.latitude as number, longitude: item.longitude as number,
    temperature: item.temperature, code: item.code, observedAt: item.observedAt, fetchedAt: item.fetchedAt };
}
export function weatherForLocation(cache: WeatherCache | null, location: WeatherLocation | null, now = Date.now()): WeatherCache | null {
  if (!cache || !location || cache.latitude !== location.latitude || cache.longitude !== location.longitude) return null;
  // Reject future timestamps too: a corrupt cache must not remain visible indefinitely.
  if (Math.max(cache.observedAt, cache.fetchedAt) > now + 60_000) return null;
  const age = now - Math.min(cache.observedAt, cache.fetchedAt);
  return age >= -60_000 && age <= WEATHER_MAX_AGE_MS ? cache : null;
}
/** WMO codes used by Open-Meteo, independent of React and localization. */
export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55].includes(code)) return "drizzle";
  if ([56, 57, 66, 67].includes(code)) return "freezingRain";
  if ([61, 63, 65].includes(code)) return "rain";
  if ([71, 73, 75, 77].includes(code)) return "snow";
  if ([80, 81, 82].includes(code)) return "showers";
  if ([85, 86].includes(code)) return "snowShowers";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "unknown";
}
export function isSystem24Hour(): boolean {
  try {
    const format = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
    const options: Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string } = format.resolvedOptions();
    if (options.hourCycle) {
      return options.hourCycle === "h23" || options.hourCycle === "h24";
    }
    return !options.hour12;
  } catch {
    return true;
  }
}

export function formatClock(
  date: Date,
  options: { hourFormat?: ClockHourFormat; showSeconds?: boolean } = {},
) {
  const { hourFormat = "auto", showSeconds = false } = options;
  const use24h = hourFormat === "24h" || (hourFormat === "auto" && isSystem24Hour());
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let hStr: string;
  if (use24h) {
    hStr = String(hours).padStart(2, "0");
  } else {
    const h12 = hours % 12 || 12;
    hStr = String(h12);
  }

  const mStr = String(minutes).padStart(2, "0");
  if (showSeconds) {
    const sStr = String(seconds).padStart(2, "0");
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${hStr}:${mStr}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function formatDateChip(date: Date): string {
  const dayName = WEEKDAYS[date.getDay()] ?? "Sun";
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

export function nextTickDelay(now: number, showSeconds: boolean): number {
  if (showSeconds) {
    return 1000 - (now % 1000);
  }
  return 60_000 - (now % 60_000);
}

export function nextMinuteDelay(now: number) { return 60_000 - (now % 60_000); }
export function formatTemperature(temperature: number) { return `${Math.round(temperature) || 0}°`; }

/** Fixed digit room: minute ticks never change the island width. Sizes are before island scaling. */
export function clockWeatherWidth(
  base: number,
  clock: boolean,
  weather: boolean,
  fontScale = 1,
  minimum = 0,
  showSeconds = false,
) {
  if (!clock && !weather) return base;
  const clockBaseWidth = showSeconds ? 68 : 48;
  return Math.min(480, Math.max(minimum, Math.ceil(base + (clock ? clockBaseWidth * fontScale + 8 : 0) + (weather ? 64 * fontScale + 8 : 0))));
}
