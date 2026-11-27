// settings.html: the search box above the page list finds a page, group or setting and opens it.
import { act } from "react";

type Check = (condition: unknown, message: string) => void;
type Helpers = {
  check: Check;
  openPage: (category: string) => Promise<void>;
  type: (input: HTMLInputElement, value: string) => Promise<void>;
};

const wait = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const input = () => document.querySelector<HTMLInputElement>(".settings-search__input")!;
const results = () => [...document.querySelectorAll<HTMLButtonElement>(".settings-search__result")];
const label = (button: HTMLButtonElement | undefined) => button?.querySelector(".settings-search__label")?.textContent;
const openCategory = () => document.querySelector(".settings-sidebar__item--active")?.getAttribute("data-category");
const key = (target: HTMLElement, name: string) => act(async () => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
});

export async function checkSettingsSearch({ check, openPage, type }: Helpers) {
  await openPage("general");
  check(input() && input().getAttribute("aria-label") === "Search settings", "The sidebar has a labelled search box");

  await type(input(), "pixel cat");
  check(label(results()[0]) === "Pixel cat" && results().some((button) => label(button) === "Show a pixel cat on the island"),
    "Typing finds a group and its settings by name");
  check(document.querySelectorAll(".settings-sidebar__item[data-category]").length === 0
    && document.querySelector(".settings-search__status")?.textContent === `${results().length} matches`,
  "While searching, the results take the page list's place and the count is announced");

  const cat = results().find((button) => label(button) === "Show a pixel cat on the island")!;
  check(cat.querySelector(".settings-search__where")?.textContent === "Appearance › Pixel cat", "A result says which page and group it is on");
  await act(async () => cat.click());
  await wait(60);
  check(openCategory() === "appearance" && input().value === "" && document.querySelectorAll(".settings-sidebar__item[data-category]").length > 0,
    "Picking a result opens its page, clears the box and brings the page list back");
  const found = document.querySelector<HTMLElement>(".settings-row.settings-found");
  check(found?.querySelector(".settings-row__title")?.textContent === "Show a pixel cat on the island",
    "The setting it names is scrolled to and marked");
  await wait(2_000);
  check(!document.querySelector(".settings-found"), "The mark fades after a moment");

  await type(input(), "ENABLE  translation");
  check(label(results()[0]) === "Enable quick translation", "Case and word order do not matter");
  await key(input(), "Enter");
  await wait(60);
  check(openCategory() === "translation", "Enter opens the first result");

  await type(input(), "music");
  check(label(results()[0]) === "Music" && results()[0].querySelector(".settings-search__where") === null, "A page's own name finds the page first");
  await act(async () => results()[0].click());
  check(openCategory() === "music", "Picking a page opens it");

  // A row hidden under a switch that is off opens its page without scrolling or failing; one that is on is marked.
  await openPage("appearance");
  await type(input(), "weather location");
  const hidden = results().find((button) => label(button) === "Weather location");
  check(hidden, "A setting that only shows under a switch is still found");
  await act(async () => hidden!.click());
  await wait(60);
  const marked = document.querySelector(".settings-found .settings-row__title")?.textContent;
  check(openCategory() === "appearance" && (marked === undefined || marked === "Weather location"),
    "Opening it lands on the page, marking the row only when it is on screen");

  await type(input(), "zzzzzz");
  check(results().length === 0 && document.querySelector(".settings-search__status")?.textContent === "No matching settings", "A search with no match says so");
  await key(input(), "Escape");
  check(input().value === "" && document.querySelectorAll(".settings-sidebar__item[data-category]").length > 0, "Esc clears the box");
}
