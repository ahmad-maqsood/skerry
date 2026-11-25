// pnpm dev, then open /tests/regression/settings-error-boundary.html. A settings page that throws while
// drawing shows an error with a retry, while the sidebar and the title keep working.
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import type { SettingsCategory } from "../../src/windows/settings/categories";
import { LayoutEditor } from "../../src/windows/settings/LayoutEditor";
import { SettingsErrorBoundary } from "../../src/windows/settings/SettingsErrorBoundary";

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
window.addEventListener("beforeunload", () => {
  if (savedLocale === null) localStorage.removeItem(LOCALE_STORAGE_KEY);
  else localStorage.setItem(LOCALE_STORAGE_KEY, savedLocale);
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let broken = true;
function Page({ category }: { category: SettingsCategory }) {
  if (category === "clipboard" && broken) throw new Error("clipboard exploded");
  return <p className="page-body">Page: {category}</p>;
}

// The same shape as SettingsPanel: the boundary is keyed by page inside the layout.
function Panel() {
  const [category, setCategory] = useState<SettingsCategory>("clipboard");
  return (
    <LayoutEditor category={category} onCategoryChange={setCategory}>
      <SettingsErrorBoundary key={category}>
        <Page category={category} />
      </SettingsErrorBoundary>
    </LayoutEditor>
  );
}

const messages: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  messages.push(`PASS ${message}`);
};
const host = document.getElementById("root")!;
const root = createRoot(host);
const element = <T extends Element = HTMLElement>(selector: string) => {
  const found = host.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
};
const originalError = console.error;
try {
  // React reports a caught render error with console.error; keep the expected one out of the output.
  console.error = () => {};
  await act(async () => {
    root.render(<StrictMode><I18nProvider><Panel /></I18nProvider></StrictMode>);
  });
  console.error = originalError;

  check(element("[role='alert']").textContent === "This page could not be shown.", "A page that throws shows the error message");
  check(host.textContent?.includes("clipboard exploded"), "The error's own message is shown");
  check(host.querySelector(".settings-sidebar__item--active") !== null && host.querySelector(".settings-page__title") !== null,
    "The sidebar and the page title stay");

  await act(async () => { element<HTMLButtonElement>("[data-category='todos']").click(); });
  check(!host.querySelector("[role='alert']") && host.textContent?.includes("Page: todos"), "Opening another page works and clears the error");

  await act(async () => { element<HTMLButtonElement>("[data-category='clipboard']").click(); });
  check(host.querySelector("[role='alert']") !== null, "The broken page fails again when reopened");

  broken = false;
  const retry = [...host.querySelectorAll<HTMLButtonElement>(".settings-link-button")].find((button) => button.textContent === "Try again");
  if (!retry) throw new Error("Missing the Try again button");
  await act(async () => { retry.click(); });
  check(!host.querySelector("[role='alert']") && host.textContent?.includes("Page: clipboard"), "Try again draws the page once it no longer throws");

  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  document.documentElement.dataset.testResult = "failed";
  messages.push(`FAIL ${String(error)}`);
  originalError(error);
} finally {
  console.error = originalError;
  document.getElementById("results")!.textContent = messages.join("\n");
}
