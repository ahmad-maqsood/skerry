import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { PluginsSettingsPage } from "../../src/windows/settings/PluginsSettingsPage";
import { I18nProvider, LOCALE_STORAGE_KEY, TRANSLATIONS } from "../../src/i18n";
import type { PluginIndexEntry } from "../../src/features/plugins/api";
import { PLUGINS_ENABLED } from "../../src/features/releaseFlags.ts";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import "../../src/windows/settings/LayoutEditor.css";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const locale = "en";
localStorage.setItem(LOCALE_STORAGE_KEY, locale);
const t = TRANSLATIONS[locale].settings.plugins;
const stored = "D:\\CodexBuild\\plugins\\plugins-index.json";
const registry = { installed: {}, developerMode: true, indexUrl: stored };
const snapshot = () => ({ registry: { ...registry }, live: {} });
const requests: { resolve: (items: PluginIndexEntry[]) => void; reject: (reason: string) => void }[] = [];
let resolveRegistry: (() => void) | undefined;
let opened = "";
let failOpen = false;
const hostCalls: string[] = [];
mockIPC((command, payload) => {
  hostCalls.push(command);
  const args = (payload ?? {}) as Record<string, unknown>;
  if (command === "get_plugins") return resolveRegistry
    ? snapshot()
    : new Promise((resolve) => { resolveRegistry = () => resolve(snapshot()); });
  if (command === "get_plugins_index") return new Promise<PluginIndexEntry[]>((resolve, reject) => requests.push({ resolve, reject }));
  if (command === "configure_plugins") { registry.developerMode = Boolean(args.developerMode); registry.indexUrl = String(args.indexUrl); return null; }
  if (command === "plugin:opener|open_url") {
    if (failOpen) throw new Error("open failed");
    opened = String(args.url); return null;
  }
  return null;
}, { shouldMockEvents: true });
const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const wait = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text)!;
const app = createRoot(document.getElementById("fixture")!);
try {
  await act(async () => app.render(<StrictMode><I18nProvider><PluginsSettingsPage /></I18nProvider></StrictMode>)); await wait();
  if (!PLUGINS_ENABLED) {
    const guide = document.querySelector<HTMLElement>(".plugin-development")!;
    check(guide?.textContent?.includes(t.comingSoon) && guide.textContent.includes(t.invitation), "Displays localized plugin roadmap and contribution guide when disabled");
    check(!document.querySelector(".plugins-settings, details, input, select") && hostCalls.length === 0,
      "When off there is no install, enable or developer feature, and no host, event or index requests");
    const link = button(t.readGuide);
    await act(async () => { failOpen = true; link.click(); });
    check(guide.querySelector("[role='alert']")?.textContent === t.openGuideFailed, "Provides localized error in-place on link opening failure");
    await act(async () => { failOpen = false; link.click(); });
    check(opened === "https://github.com/ahmad-maqsood/skerry-island/blob/main/docs/plugins/README.md" && !guide.querySelector("[role='alert']"), "Retry opens specification overview via opener and clears error");
    const fixture = document.getElementById("fixture")!;
    check(guide.scrollWidth <= fixture.clientWidth && link.getBoundingClientRect().right <= fixture.getBoundingClientRect().right + 1,
      "The guide links do not overflow in the narrow layout");
  } else {
    check(requests.length >= 1, "Index request started");
    await act(async () => resolveRegistry?.()); await wait();
    const developer = document.querySelector<HTMLDetailsElement>("details")!;
    check(!developer.open, "Developer section collapsed by default");
    await act(async () => developer.querySelector("summary")!.click());
    const input = document.querySelector<HTMLInputElement>(`input[aria-label='${t.index}']`)!;
    check(input.value === stored, "Displays saved Windows index path after asynchronous restore");
    check(!button(t.save).disabled, "Can set local index while network requests remain pending");
    await act(async () => requests[requests.length - 1].reject("HTTP 404 https://github.com/releases/missing")); await wait();
    check(document.body.textContent?.includes(t.unavailable) && !document.body.textContent?.includes("HTTP 404"), "Displays short translated status on index failure");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    const next = "D:\\Skerry\\artifacts\\plugins\\plugins-index.json";
    await act(async () => { setter.call(input, next); input.dispatchEvent(new Event("input", { bubbles: true })); });
    const beforeSave = requests.length;
    await act(async () => button(t.save).click()); await wait();
    check(registry.indexUrl === next && requests.length > beforeSave, "Saving path automatically reads new index");
    const newest = requests[requests.length - 1];
    await act(async () => newest.resolve([])); await wait();
    await act(async () => requests[0].reject("old request failed")); await wait();
    check(!document.body.textContent?.includes(t.unavailable), "Stale requests cannot overwrite newer index results");
    await act(async () => document.querySelector<HTMLButtonElement>(`button[aria-label='${t.develop}']`)!.click());
    check(opened === "https://github.com/ahmad-maqsood/skerry-island/blob/main/docs/plugins/README.md", "Development guide uses existing external link opener");
    check(input.getBoundingClientRect().right <= document.getElementById("fixture")!.getBoundingClientRect().right + 1, "Path input box does not overflow in narrow layouts");
  }
  await act(async () => app.unmount());
  document.getElementById("results")!.textContent = [...messages, "ALL PASS"].join("\n");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  document.getElementById("results")!.textContent = [...messages, `FAIL ${String(error)}`].join("\n");
  document.documentElement.dataset.testResult = "failed";
}
