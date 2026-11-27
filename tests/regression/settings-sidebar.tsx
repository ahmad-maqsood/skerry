// pnpm dev, then open /tests/regression/settings-sidebar.html. The settings page list on its own:
// groups set apart by space (named for screen readers) and About at the bottom. ?page=<category> starts there.
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { SettingsSidebar } from "../../src/windows/settings/SettingsSidebar";
import { settingsCategoryFor, type SettingsCategory } from "../../src/windows/settings/categories";
import type { SettingsSearchTarget } from "../../src/windows/settings/searchSettings";

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
window.addEventListener("beforeunload", () => {
  if (savedLocale === null) localStorage.removeItem(LOCALE_STORAGE_KEY);
  else localStorage.setItem(LOCALE_STORAGE_KEY, savedLocale);
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let opened: SettingsCategory[] = [];
const jumps: SettingsSearchTarget[] = [];
function Sidebar({ start }: { start: SettingsCategory }) {
  const [category, setCategory] = useState<SettingsCategory>(start);
  return (
    <SettingsSidebar
      category={category}
      onCategoryChange={(next) => {
        opened.push(next);
        setCategory(next);
      }}
      onSearchJump={(target) => jumps.push(target)}
    />
  );
}

const messages: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  messages.push(`PASS ${message}`);
};
const host = document.getElementById("sidebar")!;
const root = createRoot(host);
const mount = (start: SettingsCategory) =>
  act(async () => {
    root.render(<StrictMode><I18nProvider><Sidebar start={start} /></I18nProvider></StrictMode>);
  });
const element = <T extends Element = HTMLElement>(selector: string) => {
  const found = host.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
};
const listed = () => [...host.querySelectorAll<HTMLElement>(".settings-sidebar__item[data-category]")].map((item) => item.dataset.category!);
try {
  await mount(settingsCategoryFor(new URLSearchParams(location.search).get("page") ?? "") ?? "general");
  if (new URLSearchParams(location.search).has("page")) throw "manual";

  const groups = () => [...host.querySelectorAll<HTMLElement>(".settings-sidebar__group")].map((group) => group.getAttribute("aria-label")).filter(Boolean);
  check(groups().join("|") === "Basics|Features" && !host.querySelector(".settings-sidebar__heading"),
    "Pages sit in two named groups (Plugins, Changelog and About after them), set apart by space rather than visible headings");
  check(host.querySelectorAll("input").length === 1 && host.querySelector("input")?.getAttribute("role") === "searchbox"
    && !host.querySelector("button[aria-expanded]"), "One search box above the list and nothing to fold");
  check(listed().join() === "general,appearance,todos,music,translation,clipboard,messages,system,plugins,changelog,about",
    "Every page is listed once, in sidebar order");
  const listGroups = [...host.querySelectorAll<HTMLElement>(".settings-sidebar__list .settings-sidebar__group")];
  const lastGroup = listGroups[listGroups.length - 1];
  // Plugins and Changelog share the final untitled group with About.
  check(!host.querySelector(".settings-sidebar__footer") && !lastGroup?.getAttribute("aria-label")
    && [...lastGroup.querySelectorAll<HTMLElement>("[data-category]")].map(item => item.dataset.category).join() === "plugins,changelog,about"
    && lastGroup.previousElementSibling?.querySelector("li:last-child [data-category='system']"),
    "Plugins, Changelog then About share the final untitled group below Features, not pinned to a footer");
  check(settingsCategoryFor("plugins") === "plugins", "The plugin guide route is always available");
  check(element(".settings-sidebar__item--active").dataset.category === "general", "The open page is marked");
  await act(async () => { element<HTMLButtonElement>("[data-category='clipboard']").click(); });
  check(opened[opened.length - 1] === "clipboard" && element(".settings-sidebar__item--active").dataset.category === "clipboard"
    && element("[data-category='clipboard']").getAttribute("aria-current") === "page", "Clicking a page opens and marks it");

  // The search box swaps the list for results, and a picked result is handed to the page.
  const box = element<HTMLInputElement>("input");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(box, "pixel");
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  check(listed().length === 0 && host.querySelectorAll(".settings-search__result").length > 0, "Typing replaces the page list with matching results");
  await act(async () => { host.querySelector<HTMLButtonElement>(".settings-search__result")!.click(); });
  check(jumps.length === 1 && jumps[0].page === "appearance" && jumps[0].group === "Pixel cat" && listed().length === 11 && box.value === "",
    "Picking a result reports its page and group, clears the box and brings the list back");

  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  if (error !== "manual") {
    document.documentElement.dataset.testResult = "failed";
    messages.push(`FAIL ${String(error)}`);
    console.error(error);
  }
} finally {
  document.getElementById("results")!.textContent = messages.join("\n");
}
