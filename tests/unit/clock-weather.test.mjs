import test from "node:test";
import assert from "node:assert/strict";
import {
  firstLaunchClockWeatherSettings,
  normalizeClockWeatherSettings,
  normalizeWeatherCache,
  normalizeWeatherLocation,
  weatherForLocation,
  weatherCondition,
  WEATHER_MAX_AGE_MS,
  clockWeatherWidth,
  formatClock,
  formatDateChip,
  nextMinuteDelay,
  nextTickDelay,
  formatTemperature,
} from "../../src/features/weather/model.ts";
import { normalizeCollapsedHidden, placeCollapsedLayout, visibleCollapsedSlots } from "../../src/features/appearance/collapsedLayout.ts";
import { normalizeBehaviorSettings } from "../../src/features/appearance/normalizeBehaviorSettings.ts";

const location = { name: "Beijing", latitude: 39.9, longitude: 116.4 };
const now = 1795089700000;
const cache = { ...location, temperature: 23.2, code: 2, observedAt: now - 100000, fetchedAt: now };

test("clock is ON by default and weather stays OFF by default", () => {
  for (const value of [null, [], "bad", undefined]) {
    assert.deepEqual(normalizeClockWeatherSettings(value), {
      showClock: true,
      showWeather: false,
      location: null,
      hourFormat: "auto",
      showSeconds: false,
      showDateOnHover: true,
    });
  }
  assert.deepEqual(normalizeClockWeatherSettings({ showClock: false, showWeather: true, location, hourFormat: "12h", showSeconds: true, showDateOnHover: false }), {
    showClock: false,
    showWeather: true,
    location,
    hourFormat: "12h",
    showSeconds: true,
    showDateOnHover: false,
  });
  for (const value of [{ ...location, latitude: NaN }, { ...location, longitude: 181 }, { ...location, latitude: "39" }, {}]) {
    assert.equal(normalizeWeatherLocation(value), null);
  }
});

test("a fresh install starts with the time off, an older install without the key keeps it on", () => {
  assert.deepEqual(firstLaunchClockWeatherSettings(), { ...normalizeClockWeatherSettings(undefined), showClock: false });
  assert.equal(firstLaunchClockWeatherSettings().showWeather, false);
  assert.equal(normalizeClockWeatherSettings(undefined).showClock, true);
});

test("only a matching city and observations no older than three hours may be displayed", () => {
  const normalized = normalizeWeatherCache(cache);
  assert.equal(weatherForLocation(normalized, location, now), normalized);
  assert.equal(weatherForLocation(normalized, { ...location, latitude: 40 }, now), null);
  assert.equal(weatherForLocation(normalized, null, now), null);
  assert.equal(weatherForLocation(normalized, location, cache.observedAt + WEATHER_MAX_AGE_MS), normalized);
  assert.equal(weatherForLocation(normalized, location, cache.observedAt + WEATHER_MAX_AGE_MS + 1), null);
  assert.equal(weatherForLocation(normalized, location, now - WEATHER_MAX_AGE_MS), null);
  for (const patch of [{ temperature: NaN }, { temperature: 999 }, { code: 2.5 }, { observedAt: -1 }, { fetchedAt: Infinity }]) {
    assert.equal(normalizeWeatherCache({ ...cache, ...patch }), null);
  }
});

test("WMO weather families map to icon/copy keys and unknown codes safely fall back", () => {
  const groups = {
    clear: [0], partlyCloudy: [1, 2], cloudy: [3], fog: [45, 48], drizzle: [51, 53, 55],
    freezingRain: [56, 57, 66, 67], rain: [61, 63, 65], snow: [71, 73, 75, 77],
    showers: [80, 81, 82], snowShowers: [85, 86], thunderstorm: [95, 96, 99], unknown: [-1, 4, 100, NaN],
  };
  for (const [condition, codes] of Object.entries(groups)) for (const code of codes) assert.equal(weatherCondition(code), condition);
});

test("formatting covers 12h, 24h, seconds, midnight, noon, and date chip", () => {
  // Midnight 00:05:09 on Saturday Nov 21 2026
  const midnight = new Date(2026, 10, 21, 0, 5, 9);
  assert.equal(formatClock(midnight, { hourFormat: "24h" }), "00:05");
  assert.equal(formatClock(midnight, { hourFormat: "12h" }), "12:05");
  assert.equal(formatClock(midnight, { hourFormat: "24h", showSeconds: true }), "00:05:09");
  assert.equal(formatClock(midnight, { hourFormat: "12h", showSeconds: true }), "12:05:09");
  assert.equal(formatDateChip(midnight), "Sat 21");

  // Noon 12:00:00 on Sunday Nov 22 2026
  const noon = new Date(2026, 10, 22, 12, 0, 0);
  assert.equal(formatClock(noon, { hourFormat: "24h" }), "12:00");
  assert.equal(formatClock(noon, { hourFormat: "12h" }), "12:00");
  assert.equal(formatDateChip(noon), "Sun 22");

  // Afternoon 23:59:59
  const late = new Date(2026, 10, 21, 23, 59, 59);
  assert.equal(formatClock(late, { hourFormat: "24h" }), "23:59");
  assert.equal(formatClock(late, { hourFormat: "12h" }), "11:59");
  assert.equal(formatClock(late, { hourFormat: "12h", showSeconds: true }), "11:59:59");

  // DST / edge dates
  const springDST = new Date(2026, 2, 8, 2, 30, 0);
  assert.equal(formatClock(springDST, { hourFormat: "24h" }), "02:30");
  assert.equal(formatClock(springDST, { hourFormat: "12h" }), "2:30");

  const fallDST = new Date(2026, 10, 1, 1, 30, 0);
  assert.equal(formatClock(fallDST, { hourFormat: "24h" }), "01:30");
  assert.equal(formatClock(fallDST, { hourFormat: "12h" }), "1:30");
});

test("nextTickDelay realigns to second or minute boundaries", () => {
  assert.equal(nextMinuteDelay(60000), 60000);
  assert.equal(nextMinuteDelay(119999), 1);
  assert.equal(nextMinuteDelay(60001), 59999);

  assert.equal(nextTickDelay(1000, true), 1000);
  assert.equal(nextTickDelay(1250, true), 750);
  assert.equal(nextTickDelay(1999, true), 1);
  assert.equal(nextTickDelay(60001, false), 59999);

  assert.equal(formatTemperature(-0.1), "0°");
  assert.equal(formatTemperature(-2.6), "-3°");
});

test("old collapsed layouts retain their order, gain the light before the text and clock/weather at the end", () => {
  const old = ["music", "text", "shelf", "mail"];
  assert.deepEqual(normalizeBehaviorSettings({ collapsedLayout: old }).collapsedLayout, ["music", "pulse", "text", "shelf", "clock", "weather", "system"], "the retired mail slot is dropped");
  assert.deepEqual(normalizeBehaviorSettings({ collapsedLayout: ["clock", "text", "clock", "unknown"] }).collapsedLayout,
    ["clock", "pulse", "text", "shelf", "music", "weather", "system"]);
  assert.deepEqual(normalizeBehaviorSettings({ collapsedLayout: ["text", "pulse"] }).collapsedLayout,
    ["text", "pulse", "shelf", "music", "clock", "weather", "system"], "a moved light keeps its place");
  assert.deepEqual(normalizeBehaviorSettings({ collapsedLayout: ["text", "agents", "pulse"] }).collapsedLayout,
    ["text", "pulse", "shelf", "music", "clock", "weather", "system"], "the retired agents slot is dropped");
  assert.deepEqual(normalizeBehaviorSettings({}).collapsedLayout[0], "pulse");
});

test("hidden slots are known ones, once each, never the text", () => {
  assert.deepEqual(normalizeCollapsedHidden(["shelf", "text", "shelf", "nope", "mail", "pulse"]), ["shelf", "pulse"]);
  assert.deepEqual(normalizeCollapsedHidden("shelf"), []);
  assert.deepEqual(normalizeBehaviorSettings({}).collapsedHidden, []);
  assert.deepEqual(visibleCollapsedSlots(["pulse", "text", "shelf", "music"], ["shelf"]), ["pulse", "text", "music"]);
});

test("status sizing reserves fixed clock/weather space and respects seconds option", () => {
  assert.equal(clockWeatherWidth(280, false, false, 1, 400), 280);
  assert.equal(clockWeatherWidth(280, true, false), 336);
  assert.equal(clockWeatherWidth(280, true, false, 1, 0, true), 356);
  assert.equal(clockWeatherWidth(280, false, true), 352);
  assert.equal(clockWeatherWidth(340, true, true, 1.2), 480);
  assert.equal(clockWeatherWidth(240, true, true, 1, 432), 432);
});

test("arranging the editor keeps uninstalled plugin slots in their saved places", () => {
  const saved = ["clock", "pulse", "text", "music", "weather", "system", "shelf"];
  assert.deepEqual(placeCollapsedLayout(saved, ["music", "pulse", "text", "system"], ["clock", "weather"]),
    ["clock", "music", "pulse", "text", "weather", "system", "shelf"]);
  assert.deepEqual(placeCollapsedLayout(saved, ["shelf", "text"], []), ["shelf", "text", "clock", "pulse", "music", "weather", "system"]);
});
