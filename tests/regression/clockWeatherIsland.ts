import { act } from "react";
import { setClockWeatherSettings } from "../../src/features/weather";
import { CLOCK_WEATHER_KEY, WEATHER_CACHE_KEY } from "../../src/features/weather/storage";
import { WEATHER_MAX_AGE_MS } from "../../src/features/weather/model";

export const clockWeatherMock = {
  offline: false, requests: 0,
  current() {
    this.requests++;
    if (this.offline) throw new Error("offline");
    return { temperature: 23, code: 2, observedAt: Date.now(), fetchedAt: Date.now() };
  },
};

export async function checkClockWeatherIsland(
  check: (condition: unknown, message: string) => void,
  settle: (ms: number) => Promise<void>,
) {
  const city = { name: "Beijing · China", latitude: 39.9, longitude: 116.4 };
  const clock = () => document.querySelector<HTMLElement>(".island__collapsed .collapsed-clock");
  const weather = () => document.querySelector<HTMLElement>(".island__collapsed .collapsed-weather");
  const island = () => document.querySelector<HTMLElement>(".island")!;

  await act(async () => {
    setClockWeatherSettings({
      showClock: false,
      showWeather: false,
      location: null,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  await settle(800);
  check(!clock() && !weather(), "Both slots completely hidden when toggled off");

  await act(async () => {
    setClockWeatherSettings({
      showClock: true,
      showWeather: false,
      location: null,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  await settle(450);
  check(/^\d{2}:\d{2}$/.test(clock()?.textContent ?? "") && !weather() && clockWeatherMock.requests === 0,
    "Shows 24h clock, no weather request when city not chosen");

  await act(async () => {
    setClockWeatherSettings({
      showClock: true,
      showWeather: true,
      location: city,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  await settle(450);
  check(weather()?.textContent === "23°" && weather()?.querySelector("svg") && clockWeatherMock.requests === 1,
    "Shows weather icon and temp when city selected");

  const bar = document.querySelector<HTMLElement>(".island__collapsed")!;
  const box = island().getBoundingClientRect();
  check([...bar.children].every(child => {
    const rect = child.getBoundingClientRect();
    return rect.left >= box.left + 8 && rect.right <= box.right - 8;
  }) && bar.querySelector(".island__text-slot")!.getBoundingClientRect().width >= 64,
    "All collapsed slots remain readable and fit in island");

  const fixedClockWidth = clock()!.getBoundingClientRect().width;
  await act(async () => window.dispatchEvent(new Event("focus")));
  check(clock()!.getBoundingClientRect().width === fixedClockWidth, "Time alignment refresh does not change fixed digit width");

  await act(async () => {
    setClockWeatherSettings({
      showClock: false,
      showWeather: true,
      location: city,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  check(!clock() && weather(), "Disabling time does not affect weather");

  await act(async () => {
    localStorage.setItem(CLOCK_WEATHER_KEY, JSON.stringify({
      showClock: true,
      showWeather: false,
      location: city,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    }));
    window.dispatchEvent(new StorageEvent("storage", { key: CLOCK_WEATHER_KEY }));
  });
  check(clock() && !weather(), "Storage event syncs to island");

  // A near-expiry cached observation plus a failed fetch exercises real expiry timers.
  const oldCity = { name: "Cached city", latitude: 40.1, longitude: 116.1 };
  clockWeatherMock.offline = true;
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ...oldCity, temperature: -2.5, code: 71,
    observedAt: Date.now() - WEATHER_MAX_AGE_MS + 900, fetchedAt: Date.now() - WEATHER_MAX_AGE_MS + 900 }));
  await act(async () => {
    setClockWeatherSettings({
      showClock: true,
      showWeather: true,
      location: oldCity,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  await settle(100);
  check(weather()?.textContent === "-2°" && !document.querySelector("[role=alert]"),
    "Valid weather cache is preserved during fetch failure");
  await settle(1000);
  check(!weather(), "Automatically hides when observation is over 3 hours old without waiting for next refresh");
  clockWeatherMock.offline = false;
  await act(async () => {
    setClockWeatherSettings({
      showClock: true,
      showWeather: true,
      location: city,
      hourFormat: "24h",
      showSeconds: false,
      showDateOnHover: true,
    });
  });
  await settle(450);
  check(weather()?.textContent === "23°" && !weather()?.textContent?.includes("-2"),
    "Switching back reads matching cache");
}
