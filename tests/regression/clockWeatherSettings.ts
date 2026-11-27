import { act } from "react";
import { TRANSLATIONS } from "../../src/i18n";
import { CLOCK_WEATHER_KEY } from "../../src/features/weather/storage";
import { PIXEL_CAT_KEY } from "../../src/features/pixel-cat/storage";

export async function checkClockWeatherSettings(locale: "en", check: (value: unknown, label: string) => void) {
  const t = TRANSLATIONS[locale].settings.plugins.clockWeather;
  const saved = () => JSON.parse(localStorage.getItem(CLOCK_WEATHER_KEY) ?? "{}");
  const savedCat = () => JSON.parse(localStorage.getItem(PIXEL_CAT_KEY) ?? "{}");
  const toggle = (title: string) => [...document.querySelectorAll<HTMLElement>(".settings-row")]
    .find(row => row.querySelector(".settings-row__title")?.textContent === title)!
    .querySelector<HTMLInputElement>("[role=switch]")!;
  const type = async (value: string) => act(async () => {
    const input = document.querySelector<HTMLInputElement>(`input[aria-label='${t.city}']`)!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const search = async (value: string) => {
    await type(value);
    await act(async () => document.querySelector<HTMLInputElement>(`input[aria-label='${t.city}']`)!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  };

  localStorage.removeItem(CLOCK_WEATHER_KEY);
  localStorage.removeItem(PIXEL_CAT_KEY);
  check(saved().showClock !== false, "Clock is on by default");
  const showClockToggle = toggle(t.showClock);
  check(showClockToggle.checked, "Clock toggle is checked by default");

  await act(async () => showClockToggle.click());
  check(!saved().showClock, "Time switch saved independently");

  // The cat takes the time's place: switching one on switches the other off.
  const catToggle = toggle(TRANSLATIONS[locale].pixelCat.show);
  await act(async () => catToggle.click());
  check(savedCat().enabled === true && saved().showClock === false, "Pixel cat on keeps the time off");
  await act(async () => toggle(t.showClock).click());
  check(saved().showClock === true && savedCat().enabled === false, "Time on turns the pixel cat off");
  await act(async () => toggle(TRANSLATIONS[locale].pixelCat.show).click());
  check(savedCat().enabled === true && saved().showClock === false, "Pixel cat on turns the time off");
  // The "when a song is playing" row shows with the cat, on by default, and saves on its own.
  const whilePlayingToggle = toggle(TRANSLATIONS[locale].pixelCat.whilePlaying);
  check(whilePlayingToggle.checked && savedCat().whilePlaying !== false, "Cat when a song is playing is on by default");
  await act(async () => whilePlayingToggle.click());
  check(savedCat().whilePlaying === false && savedCat().enabled === true, "Cat when a song is playing switches off alone");
  await act(async () => toggle(TRANSLATIONS[locale].pixelCat.whilePlaying).click());
  check(savedCat().whilePlaying === true, "Cat when a song is playing switches back on");
  await act(async () => toggle(TRANSLATIONS[locale].pixelCat.show).click());
  check(savedCat().enabled === false && saved().showClock === false, "Pixel cat off leaves the time as it was");

  const showWeatherToggle = toggle(t.showWeather);
  check(!saved().showWeather, "Weather is off by default");

  await act(async () => showWeatherToggle.click());
  check(saved().showWeather, "Weather switch toggles on");

  await search("Beijing");
  const result = document.querySelector<HTMLButtonElement>(".clock-weather-settings__cities button")!;
  check(result?.textContent?.includes("Beijing"), "City search displays selectable results");
  await act(async () => result.click());
  check(saved().location?.latitude === 39.9 && saved().location?.longitude === 116.4
    && !document.querySelector(".clock-weather-settings__cities"), "Selected city saves name and coordinates");

  await search("empty");
  check(document.querySelector("[role=status]")?.textContent === t.noCities, "Empty city results show feedback");
  await search("offline");
  check(document.querySelector("[role=status]")?.textContent === t.searchFailed, "City search failure allows in-place retry");
}
