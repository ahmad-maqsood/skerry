// The real island and todo hooks with fake wall time; no minutes-long waits or fake timer UI.
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { IslandApp } from "../../src/windows/island/IslandApp";
import { getLocalDateString } from "../../src/utils/date";
import { ACTIVE_TODOS_STORAGE_KEY, TODO_DURATIONS_STORAGE_KEY, TODO_TIMER_STORAGE_KEY, TODO_TIMERS_STORAGE_KEY } from "../../src/features/todos/storage";
import type { TodoTimer } from "../../src/features/todos/timer";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import { checkTodoReminders } from "./todoTimerReminder";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const query = new URLSearchParams(location.search);
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("skerry-")));
const realNow = Date.now;
const realAudio = window.Audio;
let now = realNow();
let sounds = 0;
let visible = true;
let showCalls = 0;
let version = 0;
Date.now = () => now;
Object.defineProperty(window, "Audio", { configurable: true, value: class {
  volume = 1;
  play() { sounds++; return Promise.resolve(); }
} });
window.addEventListener("beforeunload", () => {
  Date.now = realNow;
  Object.defineProperty(window, "Audio", { configurable: true, value: realAudio });
  for (const key of Object.keys(localStorage).filter((key) => key.startsWith("skerry-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
});
for (const key of original.keys()) localStorage.removeItem(key);
localStorage.setItem(LOCALE_STORAGE_KEY, query.get("lang") === "en" ? "en" : "en");
localStorage.setItem("skerry-current-date", getLocalDateString());
localStorage.setItem("skerry-todos", JSON.stringify([
  { id: "t1", title: "Check demo steps in the script", completed: false, createdAt: now },
  { id: "t2", title: "Review the release notes and prepare screenshots", completed: false, createdAt: now },
]));
localStorage.setItem("skerry-settings", JSON.stringify({
  musicEnabled: false, shelfEnabled: false,
  rotateTodos: false, todoRotationSeconds: 3, autoCollapseSeconds: 0,
  autoTuck: false, expandedScale: Number(query.get("scale") ?? 1),
  carryOverIncompleteTodos: false, todoTimerEnabled: true,
}));
localStorage.setItem("skerry-save-directory", "");

mockIPC((command, payload) => {
  switch (command) {
    case "show_ready_island": showCalls++; return null;
    case "plugin:window|is_visible": return visible;
    case "get_system_notifications_state": return { revision: 1, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items: [] };
    case "get_clipboard_history": return {
      settings: { enabled: false, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: false }, items: [],
    };
    case "get_file_shelf": return { items: [] };
    case "get_media_state": return DEFAULT_MEDIA_STATE;
    case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
    case "set_island_interaction": return "disabled";
    case "get_island_top_attachment": return true;
                case "set_translation_shortcut": return (payload as { shortcut: string }).shortcut;
    case "updater_configured":
    case "has_translation_secret": return false;
    default: return null;
  }
}, { shouldMockEvents: true });
mockWindows("main");

const root = createRoot(document.getElementById("root")!);
const results = document.getElementById("results")!;
const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const mount = () => act(async () => {
  root.render(<StrictMode key={version++}><I18nProvider><IslandApp /></I18nProvider></StrictMode>);
});
const click = (selector: string) => act(async () => {
  const button = document.querySelector<HTMLElement>(selector);
  if (!button) throw new Error(`Missing ${selector}`);
  button.click();
});
const open = () => click(".island__open-button");
const start = (id: string) => click(`[data-todo-id="${id}"] .todo-start`);
// Wait for island expansion animation to finish before clicking stopwatch: watch moves during animation; late scroll events would dismiss settings.
const settle = async () => {
  const deadline = performance.now() + 5000;
  while (performance.now() < deadline && document.querySelector(".island")!.getAnimations().some((a) => a.playState === "running")) {
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
  }
};
const choose = async (id: string) => { await settle(); await click(`[data-todo-id="${id}"] .todo-timer-button`); };
const watchLabel = (id: string) => document.querySelector(`[data-todo-id="${id}"] .todo-timer-button`)?.getAttribute("aria-label");
const escape = () => act(async () => {
  document.querySelector(".todo-duration-picker")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
});
const stored = () => JSON.parse(localStorage.getItem(TODO_TIMER_STORAGE_KEY) ?? "null") as TodoTimer | null;
const collapsedTime = () => document.querySelector(".island__active-task")?.textContent;
const advance = (milliseconds: number) => act(async () => {
  now += milliseconds;
  document.dispatchEvent(new Event("visibilitychange"));
});
const typeMinutes = (value: string) => act(async () => {
  const input = document.querySelector<HTMLInputElement>(".todo-duration-picker input")!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const pick = async (minutes: number) => {
  await typeMinutes(String(minutes));
  await act(async () => { document.querySelector(".todo-duration-picker input")!.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
};
const go = () => act(async () => {
  document.querySelector<HTMLFormElement>(".todo-duration-picker")!.requestSubmit();
});
const layoutSettled = async () => {
  const deadline = performance.now() + 5000;
  while (performance.now() < deadline) {
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
    const picker = document.querySelector<HTMLElement>(".todo-duration-picker");
    const island = document.querySelector<HTMLElement>(".island")!;
    if (picker && !island.getAnimations().some((animation) => animation.playState === "running")
      && picker.getBoundingClientRect().top >= island.getBoundingClientRect().top) return;
  }
  throw new Error("Duration picker layout did not settle or was clipped by the island");
};

try {
  await mount();
  await open();
  check(document.querySelectorAll(".todo-drag-handle").length === 2, "Default settings expose both reorder handles");
  await settle();
  const pointer = async (type: string, target: HTMLElement, x: number, y: number) => act(async () => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, clientX: x, clientY: y }));
  });
  const handle = document.querySelector<HTMLElement>('[data-todo-id="t1"] .todo-drag-handle')!;
  // Synthetic pointers have no native active-pointer record; keep real hit testing and handlers.
  handle.setPointerCapture = () => {};
  const target = document.querySelector<HTMLElement>('[data-todo-id="t2"]')!.getBoundingClientRect();
  await pointer("pointerdown", handle, 0, 0);
  // Only swap positions when dragging crosses midline of next row.
  const below = target.y + target.height * 0.75;
  await pointer("pointermove", handle, target.x + 30, below);
  await pointer("pointerup", handle, target.x + 30, below);
  const order = () => [...document.querySelectorAll<HTMLElement>("[data-todo-id]")].map((node) => node.dataset.todoId).join();
  check(order() === "t2,t1" && JSON.parse(localStorage.getItem("skerry-todos")!)[0].id === "t2", "Dragging reorders DOM and persisted todos");
  check(!document.querySelector(".todo-title-input, .todo-duration-picker") && !localStorage.getItem("skerry-active-todo"), "Dragging never edits or starts a todo");
  await mount();
  await open();
  check(order() === "t2,t1", "Reordered todos survive remount");
  const settings = (patch: object) => act(async () => {
    localStorage.setItem("skerry-settings", JSON.stringify({ ...JSON.parse(localStorage.getItem("skerry-settings")!), ...patch }));
    window.dispatchEvent(new StorageEvent("storage", { key: "skerry-settings" }));
  });
  await settings({ enableTodoReorder: false, todoReorderVersion: 1, todoTimerEnabled: false });
  check(!document.querySelector(".todo-drag-handle"), "Storage sync hides handles when disabled");
  await start("t1");
  check(!stored() && !document.querySelector(".todo-duration-picker") && localStorage.getItem("skerry-active-todo") === "t1", "Disabled timer starts immediately without picker");
  await open();
  await start("t1");
  check(!localStorage.getItem("skerry-active-todo"), "Disabled timer stops immediately");
  await settings({ todoTimerEnabled: true, enableTodoReorder: true });
  await start("t1");
  check(!stored() && !document.querySelector(".todo-duration-picker") && localStorage.getItem("skerry-active-todo") === "t1",
    "Clicking start directly after enabling timer starts task only, without countdown");
  await open();
  await start("t1");
  await choose("t1");
  await go();
  check(stored()?.durationMinutes === 15, "Clicking start inside stopwatch starts default 15-minute countdown");
  await settings({ todoTimerEnabled: false });
  check(!stored() && localStorage.getItem("skerry-active-todo") === "t1" && !document.querySelector(".todo-countdown"), "Disabling cancels timer and preserves active todo");
  await advance(900_000);
  check(sounds === 0 && !document.querySelector(".todo-timer-actions"), "Disabled deadline cannot notify");
  await settings({ todoTimerEnabled: true });
  check(!stored(), "Re-enabling never restores cancelled timer");
  await open();
  await start("t1");
  localStorage.removeItem(TODO_DURATIONS_STORAGE_KEY);
  await mount();
  await open();
  check(watchLabel("t1")?.includes("15") && document.querySelector('[data-todo-id="t1"] .todo-timer-button + .todo-start'),
    "Start button has a stopwatch on its left, defaulting to 15 minutes the first time");
  await choose("t1");
  const watchRect = document.querySelector('[data-todo-id="t1"] .todo-timer-button')!.getBoundingClientRect();
  check(document.querySelector<HTMLInputElement>(".todo-duration-picker input")?.value === "15" && !stored(), "Clicking stopwatch opens duration picker defaulting to 15 min without starting directly");
  check(document.querySelector(".todo-duration-picker")!.getBoundingClientRect().bottom <= watchRect.top, "Duration picker appears above stopwatch");
  // List adjusts scroll position after layout change; late scroll events must not dismiss settings.
  await act(async () => { document.querySelector(".todo-list")!.dispatchEvent(new Event("scroll")); });
  check(document.querySelector(".todo-duration-picker"), "Scroll events without stopwatch movement do not dismiss duration picker");
  await go();
  const firstEnd = stored()!.endsAt;
  check(stored()?.todoId === "t1" && firstEnd === now + 900_000, "Selecting 15 min persists active todo and absolute end timestamp");
  check(document.querySelector(".island--collapsed") && collapsedTime()?.includes("15:00"), "Collapses after single-task start; collapsed island displays countdown");
  check(document.querySelector(".island__active-task-title")?.textContent === "Check demo steps in the script"
    && document.querySelector(".island__timer-pill")?.textContent === "15:00", "Collapsed island shows the task title, with the countdown in a small pill");
  await advance(850_000);
  check(collapsedTime()?.includes("00:50"), "Calculates remaining time from real end timestamp, calibrated immediately when restored");
  await mount();
  check(stored()?.endsAt === firstEnd && collapsedTime()?.includes("00:50"), "Restart restores remaining 50 seconds of same turn");
  await advance(50_000);
  check(document.querySelector(".island--expanded") && document.querySelector(".todo-timer-actions"), "Pops up todo on expiration in collapsed mode, showing time up and complete/restart");
  check(sounds === 1 && stored()?.notified, "Alerts once per turn; notification state persisted");
  await advance(10_000);
  await mount();
  check(sounds === 1 && collapsedTime()?.includes("Time’s up"), "Inaction, StrictMode remount, and restart do not duplicate sound");
  await open();
  await click(".todo-timer-actions button:last-child");
  check(stored()?.durationMinutes === 15 && stored()?.endsAt === now + 900_000 && !stored()?.notified, "Restart turn restarts countdown with original duration");
  const showBeforeHiddenExpiry = showCalls;
  visible = false;
  await advance(900_000);
  check(sounds === 2 && document.querySelector(".island--collapsed") && showCalls === showBeforeHiddenExpiry, "Alerts once on expiration while hidden in tray, without calling show or expand");
  visible = true;
  await open();
  await click(".todo-timer-actions button:first-of-type");
  check(stored() === null && localStorage.getItem("skerry-active-todo") === null, "Completion clears countdown and active state");

  check(watchLabel("t2")?.includes("15"), "Different todo has its own default 15 minutes");
  await choose("t2");
  check(document.querySelector<HTMLInputElement>(".todo-duration-picker input")?.value === "15", "Duration picker displays 15 minutes for this item");
  check(!document.querySelector("input[type=number]"), "Custom duration has no native spin buttons");
  await click(".number-stepper__button:last-child");
  check(document.querySelector<HTMLInputElement>(".number-stepper input")?.value === "20", "Custom duration steps by five");
  await typeMinutes("999");
  await act(async () => { const input = document.querySelector<HTMLInputElement>(".number-stepper input")!; input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
  check(document.querySelector<HTMLInputElement>(".number-stepper input")?.value === "240"
    && document.querySelector<HTMLButtonElement>(".number-stepper__button:last-child")?.disabled, "Custom duration clamps and disables Plus at 240");
  await typeMinutes("7");
  await act(async () => { const input = document.querySelector<HTMLInputElement>(".number-stepper input")!; input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
  await go();
  check(stored()?.durationMinutes === 7 && collapsedTime()?.includes("07:00"), "Custom 7 minutes starts and displays 07:00");
  await open();
  await start("t2");
  check(stored() === null && watchLabel("t2")?.includes("7 min"), "Cancellation clears current countdown immediately; stopwatch remembers 7 min");
  await start("t2");
  check(!stored() && localStorage.getItem("skerry-active-todo") === "t2", "Clicking start directly does not inherit 7 min; starts task only");
  await open();
  await start("t2");
  await choose("t2");
  check(document.querySelector<HTMLInputElement>(".todo-duration-picker input")?.value === "7", "Remembers custom duration; reopening shows 7 minutes");
  await click(".todo-duration-picker .number-stepper__button:last-child");
  await escape();
  check(!document.querySelector(".todo-duration-picker") && !stored() && watchLabel("t2")?.includes("12 min"), "Esc dismisses picker without starting, remembering modified 12 min");
  await start("t2");
  check(!stored(), "Clicking start directly after dismissing picker still does not count down");
  await open();
  await start("t2");
  await choose("t2");
  await go();
  check(stored()?.durationMinutes === 12, "Clicking start inside stopwatch uses modified 12 minutes");
  await open();
  await start("t2");
  await choose("t2");
  await pick(25);
  await go();
  await click(".window-actions > .icon-button:last-child");
  check(document.querySelector(".island--tucked"), "Can tuck to edge during countdown");
  await advance(1_500_000);
  check(document.querySelector(".island--expanded") && !document.querySelector(".island--tucked") && sounds === 3, "Emerges from edge and expands upon expiration, playing sound once");
  await click(".todo-timer-actions button:last-child");
  await open();
  await advance(1_500_000);
  check(document.querySelector(".island--expanded") && document.querySelector(".todo-timer-actions") && sounds === 4, "Shows actions and sounds once upon expiration when already expanded");

  await start("t2");
  await choose("t2");
  await pick(60);
  await go();
  await open();
  await click('[data-todo-id="t1"] .todo-check');
  await choose("t1");
  check(document.querySelector<HTMLInputElement>(".todo-duration-picker input")?.value === "15", "Each todo remembers its own duration: task 1 remains 15 min, independent from task 2 at 60 min");
  await escape();
  check(stored()?.todoId === "t2" && stored()?.durationMinutes === 60, "Dismissing duration picker of another item preserves active countdown");
  await choose("t1");
  await pick(90);
  await go();
  await advance(3_600_000);
  check(stored()?.todoId === "t1" && !stored()?.notified && localStorage.getItem("skerry-active-todo") === "t1" && sounds === 4,
    "Starting another task cancels the old round, so the old deadline no longer reminds");
  await open();
  await start("t1");
  await choose("t2");
  await pick(60);
  await go();
  await open();
  await click('[data-todo-id="t2"] .todo-delete');
  await advance(3_600_000);
  check(stored() === null && sounds === 4, "Deleting active todo cancels turn without expiration alert");
  await choose("t1");
  await pick(15);
  await go();
  await open();
  await click('[data-todo-id="t1"] .todo-check');
  await advance(900_000);
  check(stored() === null && sounds === 4, "Completing early cancels turn without ringing at original deadline");

  // Restore an unannounced deadline missed while the app was closed.
  const todo = { id: "restored", title: "Recheck the release notes", completed: false, createdAt: now };
  localStorage.setItem("skerry-todos", JSON.stringify([todo]));
  localStorage.setItem("skerry-active-todo", todo.id);
  // A previous day's pending round must survive the normal archive/rollover on startup.
  const previousDay = new Date();
  previousDay.setDate(previousDay.getDate() - 1);
  localStorage.setItem("skerry-current-date", getLocalDateString(previousDay));
  localStorage.setItem(TODO_TIMER_STORAGE_KEY, JSON.stringify({ todoId: todo.id, endsAt: now - 1, durationMinutes: 1, notified: false }));
  // Model an old installation with only the original single-task keys.
  localStorage.removeItem(ACTIVE_TODOS_STORAGE_KEY);
  localStorage.removeItem(TODO_TIMERS_STORAGE_KEY);
  await mount();
  check(document.querySelector(".todo-timer-actions") && stored()?.notified && sounds === 5, "Expired countdown during shutdown restores as time up with single catch-up alert");
  check(localStorage.getItem("skerry-current-date") === getLocalDateString() && stored()?.todoId === todo.id,
    "Startup day rollover archive keeps the timed task and its identity; Time’s up is not cleared by archiving");
  await mount();
  check(sounds === 5, "Offline expired alert does not duplicate after restart");
  await open();
  await click(".todo-timer-actions button:first-of-type");

  // English and both scale limits use the real constrained island, not a free-growing fixture.
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  localStorage.setItem("skerry-todos", JSON.stringify([{ ...todo, completed: false }]));
  localStorage.setItem(TODO_DURATIONS_STORAGE_KEY, JSON.stringify({ [todo.id]: 240 }));
  await mount();
  await open();
  await choose(todo.id);
  await layoutSettled();
  const picker = document.querySelector<HTMLElement>(".todo-duration-picker")!;
  const island = document.querySelector<HTMLElement>(".island")!;
  const pickerRect = picker.getBoundingClientRect();
  const islandRect = island.getBoundingClientRect();
  check(picker.textContent?.includes("min") && picker.querySelector("input")?.value === "240", "English duration copy and remembered 240 minutes display completely");
  check(picker.scrollWidth <= picker.clientWidth + 1 && pickerRect.left >= islandRect.left && pickerRect.right <= islandRect.right, "Duration picker stays within island without horizontal overflow");
  check(pickerRect.top >= islandRect.top && pickerRect.bottom <= islandRect.bottom, "Duration picker remains inside island without clipping with single todo row");

  await escape();
  await checkTodoReminders({ mount, open, choose, pick, go, advance, click, sounds: () => sounds }, check);

  if (query.get("view") === "running" || query.get("view") === "expired") {
    await go();
    if (query.get("view") === "expired") await advance(240 * 60_000);
  }
  results.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
  results.dataset.result = "passed";
} catch (error) {
  results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
  results.dataset.result = "failed";
  console.error(error);
}
