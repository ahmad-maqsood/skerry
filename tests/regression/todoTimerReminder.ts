import { act } from "react";
import { emit } from "@tauri-apps/api/event";
import type { TodoTimer } from "../../src/features/todos/timer";
import { TODO_TIMER_STORAGE_KEY } from "../../src/features/todos/storage";

type Actions = {
  mount: () => Promise<void>; open: () => Promise<void>; choose: (id: string) => Promise<void>;
  pick: (minutes: number) => Promise<void>; go: () => Promise<void>; advance: (ms: number) => Promise<void>;
  click: (selector: string) => Promise<void>; sounds: () => number;
};

/** Exercises reminder options and one-shot deadlines through the real notebook and island. */
export async function checkTodoReminders(actions: Actions, check: (condition: unknown, label: string) => void) {
  const { mount, open, choose, pick, go, advance, click, sounds } = actions;
  // The three chimes are played on real timers, 650 ms apart.
  const chimes = () => new Promise<void>((resolve) => { setTimeout(resolve, 1_500); });
  const stored = () => JSON.parse(localStorage.getItem(TODO_TIMER_STORAGE_KEY) ?? "null") as TodoTimer | null;
  const configure = async (patch: Record<string, unknown>) => act(async () => {
    localStorage.setItem("skerry-settings", JSON.stringify({ ...JSON.parse(localStorage.getItem("skerry-settings")!), ...patch }));
    window.dispatchEvent(new StorageEvent("storage", { key: "skerry-settings" }));
  });
  localStorage.setItem("skerry-todos", JSON.stringify([
    { id: "reminder", title: "Check every release step", completed: false, createdAt: Date.now() },
    { id: "second", title: "Prepare the English release notes", completed: false, createdAt: Date.now() },
  ]));
  localStorage.removeItem("skerry-active-todos"); localStorage.removeItem("skerry-active-todo");
  localStorage.removeItem("skerry-todo-timers"); localStorage.removeItem(TODO_TIMER_STORAGE_KEY);
  await configure({ todoTimerEnabled: true, todoTimerReminder: true, todoTimerReminderSound: false, rotateTodos: false });
  await mount(); await open(); await choose("reminder"); await pick(10);
  const picker = document.querySelector<HTMLElement>(".todo-duration-picker")!;
  const island = document.querySelector<HTMLElement>(".island")!;
  check(picker.querySelectorAll("input").length === 2, "Enabling advance notice adds separate reminder minute input to timer settings");
  check(picker.getBoundingClientRect().left >= island.getBoundingClientRect().left
    && picker.getBoundingClientRect().right <= island.getBoundingClientRect().right && picker.scrollWidth <= picker.clientWidth + 1,
    "English reminder duration setting stays inside the island with no horizontal overflow");
  const before = sounds();
  await go();
  check(stored()?.remindMinutes === 5 && stored()?.reminded === false, "Current turn persists 5-minute reminder threshold");
  await advance(5 * 60_000 - 1);
  check(!stored()?.reminded && !document.querySelector(".island__active-task--ending"), "Does not turn red before reminder threshold");
  await advance(1);
  // No text line: the collapsed bar's time turns red, the todo's text flashes, nothing pops up.
  check(stored()?.reminded && document.querySelector(".island__active-task--ending .todo-countdown--warning")
    && !document.body.textContent?.match(/min left/) && sounds() === before, "At the threshold the collapsed bar time turns red with no text popup, and sound is off by default");
  await open();
  check(document.querySelector('[data-todo-id="reminder"].todo-item--ending .todo-countdown--warning'), "Corresponding todo text pulses and time turns red when expanded");
  await mount();
  check(stored()?.reminded && sounds() === before && document.querySelector(".island__active-task--ending .todo-countdown--warning"),
    "Restart keeps the reminded flag and red countdown without ringing again");
  await configure({ todoTimerReminder: false });
  check(stored() && stored()?.remindMinutes === undefined && !document.querySelector(".island__active-task--ending"), "Disabling advance notice clears current reminder while keeping countdown");
  await configure({ todoTimerReminder: true, todoTimerReminderSound: true });
  // A running todo shows only its stop button; stop it before picking the next round.
  await open(); await click('[data-todo-id="reminder"] .todo-start'); await choose("reminder"); await pick(10); await go();
  await advance(5 * 60_000);
  await chimes();
  check(sounds() === before + 3, "Advance notice plays three chimes when sound is individually enabled");
  await advance(1_000); await chimes();
  check(sounds() === before + 3, "Subsequent polls do not repeat advance notice sound");
  // A running todo shows only its stop button; stop it before picking the next round.
  await open(); await click('[data-todo-id="reminder"] .todo-start'); await choose("reminder"); await pick(10); await go();
  await act(async () => emit("foreground-fullscreen-changed", { active: true, onIslandMonitor: true }));
  await advance(5 * 60_000);
  await chimes();
  check(stored()?.reminded && sounds() === before + 3, "Marks reminded without playing sound when game mode is quiet");
  await act(async () => emit("foreground-fullscreen-changed", { active: false, onIslandMonitor: false }));
  await chimes();
  check(sounds() === before + 3, "Exiting game mode does not play past reminder");
  await open(); await click('[data-todo-id="reminder"] .todo-start');
  check(stored() === null && !document.querySelector(".todo-item--ending"), "Stopping timer clears reminder and warning styles");
  await configure({ rotateTodos: true, todoTimerReminderSound: false });
  for (const id of ["reminder", "second"]) { await choose(id); await pick(10); await go(); }
  await advance(5 * 60_000);
  check(document.querySelectorAll(".todo-item--ending").length === 2, "Multiple timers reaching threshold simultaneously enter warning state individually");
  await click(".window-actions > .icon-button:last-child");
  check(document.querySelector(".todo-rotation__row.island__active-task--ending .todo-countdown--warning"), "Todo rotation timer pill also displays red reminder state");
}
