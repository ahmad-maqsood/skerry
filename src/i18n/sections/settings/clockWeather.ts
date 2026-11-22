export type ClockWeatherText = {
  title: string;
  showClock: string; showWeather: string; city: string; chooseCity: string; cityPlaceholder: string;
  hourFormat: string; hourFormatAuto: string; hourFormat12: string; hourFormat24: string;
  showSeconds: string; showDateOnHover: string;
  search: string; searching: string; noCities: string; searchFailed: string; privacy: string;
  timeLabel: (time: string) => string;
  weatherLabel: (city: string, condition: string, temperature: string) => string;
  conditions: Record<"clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "freezingRain" | "snow" | "showers" | "snowShowers" | "thunderstorm" | "unknown", string>;
};
export const en: ClockWeatherText = {
  title: "Clock & Weather",
  showClock: "Show time on the island", showWeather: "Show weather on the island", city: "Weather location",
  hourFormat: "Time format", hourFormatAuto: "Regional default (system)", hourFormat12: "12-hour", hourFormat24: "24-hour",
  showSeconds: "Show seconds", showDateOnHover: "Show date chip on hover",
  chooseCity: "Choose a city to show weather", cityPlaceholder: "Enter a city name", search: "Search", searching: "Searching cities…",
  noCities: "No cities found. Try another name.", searchFailed: "City search is unavailable. Please try again later.",
  privacy: "Weather by Open-Meteo, refreshed every 30 minutes. Only your chosen city is queried; no automatic location.",
  timeLabel: (time) => `Current time ${time}`,
  weatherLabel: (city, condition, temperature) => `${city} · ${condition} · ${temperature}C`,
  conditions: { clear: "Clear", partlyCloudy: "Partly cloudy", cloudy: "Overcast", fog: "Fog", drizzle: "Drizzle",
    rain: "Rain", freezingRain: "Freezing rain", snow: "Snow", showers: "Rain showers", snowShowers: "Snow showers", thunderstorm: "Thunderstorm", unknown: "Weather" },
};
