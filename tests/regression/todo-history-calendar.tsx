// The notebook's tabs and calendar use the real useTodos hook on seeded localStorage.
// Check progress, archived dates, scheduling and scroll bounds in the island's available space.
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import "../../src/styles/fonts.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { monthOf } from "../../src/features/todos/calendar";
import { TodoNotebook } from "../../src/features/todos/TodoNotebook";
import { useTodos } from "../../src/features/todos/useTodos";
import { addDays } from "../../src/features/todos/schedule";
import { getLocalDateString } from "../../src/utils/date";
import { TODO_ARCHIVE_EXPANDED_ISLAND_HEIGHT, TODO_CALENDAR_EXPANDED_ISLAND_HEIGHT } from "../../src/windows/island/layout";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
mockIPC(() => null);
// Island padding, header and gap above the page (layout.ts).
const ISLAND_CHROME = 86;

// The page writes the island's own keys; whatever the browser profile had comes back on leaving.
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("skerry-")));
window.addEventListener("beforeunload", () => {
  for (const key of Object.keys(localStorage).filter((key) => key.startsWith("skerry-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
});
for (const key of original.keys()) localStorage.removeItem(key);

const today = getLocalDateString();
const yesterday = addDays(today, -1);
const older = addDays(today, -3);
const oldMonth = monthOf(addDays(today, -60));
const old = `${oldMonth}-21`;
const oldEarlier = `${oldMonth}-05`;
const lastYear = addDays(today, -400);
const later = addDays(today, 3);
const item = (id: string, title: string, completed = false) => ({ id, title, completed, createdAt: 0 });
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
localStorage.setItem("skerry-current-date", today);
localStorage.setItem("skerry-save-directory", "");
localStorage.setItem("skerry-todos", JSON.stringify([
  item("t1", "Review recordings"),
  item("t2", "Add slide cover"),
  item("t3", "Book review time"),
  item("t4", "Back up files", true),
]));
localStorage.setItem("skerry-scheduled-todos", JSON.stringify([{ id: "s1", title: "Submit in 3 days", date: later, createdAt: 0 }]));
const archives = [
  { date: yesterday, todos: [item("y1", "Write report"), item("y2", "Reply email", true)], dailyNote: "", savedAt: 0, savedToDisk: false },
  { date: older, todos: [item("o1", "Tidy desktop", true)], dailyNote: "Old note", savedAt: 0, savedToDisk: true, filePath: "D:\\Notes\\x.md" },
  {
    date: old, todos: [
      item("d1", "Confirm partner feedback and delivery time, then list the shots to reshoot"),
      ...["Sort raw footage", "Reshoot opening", "Proof subtitles", "Grab cover frame", "Export preview", "Check file names", "Archive confirmations"]
        .map((title, index) => item(`d${index + 2}`, title, index > 3)),
    ], dailyNote: "", savedAt: 0, savedToDisk: false,
  },
  { date: oldEarlier, todos: [item("e1", "Discuss shot outline")], dailyNote: "", savedAt: 0, savedToDisk: false },
  { date: lastYear, todos: [item("l1", "Last year's log")], dailyNote: "", savedAt: 0, savedToDisk: false },
];
localStorage.setItem("skerry-archives", JSON.stringify(archives));

function Harness() {
  const { notebookProps } = useTodos({ carryOverIncompleteTodos: false, onStartTodo: () => {}, onMissingSaveDirectory: () => {} });
  const height = (notebookProps.pageMode === "calendar" ? TODO_CALENDAR_EXPANDED_ISLAND_HEIGHT : TODO_ARCHIVE_EXPANDED_ISLAND_HEIGHT) - ISLAND_CHROME;
  return (
    <div style={{ height }}>
      <TodoNotebook {...notebookProps} enableTodoReorder={false} scrollStartRows={6} />
    </div>
  );
}

const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const results = document.getElementById("results")!;
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label.replace(/"/g, "\\\"")}"]`);
const segment = (view: string) => $<HTMLButtonElement>(`.todo-view-switch__segment[data-view="${view}"]`)!;
const click = (element: HTMLElement | null) => act(async () => { element!.click(); });
const frame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
const type = (input: HTMLInputElement, value: string) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const fits = () => {
  const notebook = $(".todo-notebook")!;
  return notebook.scrollHeight <= notebook.clientHeight + 1 && notebook.scrollWidth <= notebook.clientWidth + 1;
};
const detail = () => $(".todo-day-detail")!;
const dayList = () => $(".todo-day-detail__body")!;
const sideBySide = () => {
  const sidebar = $(".todo-date-overview__sidebar")!.getBoundingClientRect();
  const panel = detail().getBoundingClientRect();
  return sidebar.right < panel.left && Math.abs(sidebar.top - panel.top) < 1;
};
const todayTitles = () => $$(".todo-list .todo-title").map((element) => element.textContent);
const pillMatches = (view: string) => {
  const pill = $(".todo-view-switch__pill")!.getBoundingClientRect();
  const active = segment(view).getBoundingClientRect();
  return Math.abs(pill.width - active.width) < 1;
};
// The pill slides for 280ms (TodoViewSwitch.css); measure it only after the transition has finished.
const pillSettled = async () => {
  const pill = $(".todo-view-switch__pill")!;
  const deadline = performance.now() + 1000;
  while (pill.getAnimations().some((animation) => animation.playState === "running") && performance.now() < deadline) await frame();
};

try {
  await act(async () => {
    createRoot(document.getElementById("fixture")!).render(<StrictMode><I18nProvider><Harness /></I18nProvider></StrictMode>);
  });

  // The view switch.
  const segments = $$(".todo-view-switch__segment");
  check(segments.map((element) => element.getAttribute("aria-label")).join("/") === "Tasks/Notes/Calendar", "Segmented controls are Tasks / Notes / Calendar in sequence");
  check(segment("today").textContent === "Tasks" && segments.slice(1).every((element) => element.textContent === ""), "Only active segment displays label text; others show icons only");
  check($(".todo-page-toggle:not(.todo-page-toggle--count)") === null, "Legacy individual buttons for Notes / History / Calendar removed");
  check($(".todo-date-picker") !== null && $(".todo-page-toggle--count") !== null, "Top-right of Todos shows scheduled count; input has date picker button");
  const progress = $<HTMLProgressElement>(".todo-notebook progress")!;
  check(progress.value === 1 && progress.max === 4, "Progress bar shows completed count and total count");
  await click(button("Complete: Review recordings"));
  check(progress.value === 2 && progress.max === 4, "Checking todo updates progress");
  await click(button("Mark incomplete: Review recordings"));
  await frame();
  check(pillMatches("today") && $(".todo-view-switch--ready"), "Highlight indicator aligns with active segment");

  await click(segment("daily"));
  check($(".daily-note") !== null && segment("daily").getAttribute("aria-selected") === "true" && segment("daily").textContent === "Notes", "Switches to Notes");
  check($(".todo-date-picker") === null && $(".todo-page-toggle--count") === null, "Notes page hides controls belonging solely to Todos");
  await pillSettled();
  check(pillMatches("daily"), "Highlight indicator slides to Notes");

  // Calendar.
  await click(segment("calendar"));
  check($(".todo-calendar") !== null && segment("calendar").textContent === "Calendar", "Opens Calendar");
  const weekdays = $$(".todo-calendar__weekday").map((element) => element.textContent);
  check(weekdays[0] === "M" && weekdays[6] === "S", `Week starts on Monday (${weekdays.join("")})`);
  const day = (date: string) => $<HTMLButtonElement>(`.todo-calendar__day[data-date="${date}"]`);
  const todayNumber = day(today)!.querySelector(".todo-calendar__number")!;
  check(getComputedStyle(todayNumber).backgroundColor === "rgb(116, 214, 255)" && day(today)!.getAttribute("aria-current") === "date", "Today is a solid accent-colored circle");
  check(sideBySide() && detail().dataset.date === today && $(".todo-day-detail__title")?.textContent === "Today" && dayList().textContent!.includes("Review recordings"),
    "Calendar sits on the left, with today's tasks shown on the right by default");
  if (!day(yesterday)) await click(button("Previous month"));
  check(day(yesterday)?.querySelectorAll(".todo-calendar__dot").length === 2 && day(yesterday)?.querySelector(".todo-calendar__dot--open"),
    "Days with tasks carry dots, and unfinished ones use the accent color");
  await click(day(yesterday));
  check(detail().dataset.date === yesterday && $(".todo-day-detail__summary")?.textContent === "1/2 done" &&
    $(".todo-day-row--done")?.textContent === "Reply email", "Calendar keeps the archived day's list and completion state");
  await click(button('Add "Write report" to today'));
  check(button("Already on today's list")?.disabled && detail().dataset.date === yesterday, "Adding archived todo to today from calendar does not duplicate");
  if (!day(older)) await click(button("Previous month"));
  check(day(older)?.querySelector(".todo-calendar__dot--done") && !day(older)?.querySelector(".todo-calendar__dot--open"), "Fully completed days show gray dot");
  const goToday = button("Back to today")!;
  if (!goToday.disabled) await click(goToday);
  check($(".todo-calendar__add input") !== null, "Can add todo directly to today");
  check(dayList().textContent!.includes("Write report"), "Returning to today displays restored todo");
  check(fits(), "Calendar page fits inside island");

  if (!day(later)) await click(button("Next month"));
  check(day(later)?.querySelector(".todo-calendar__dot--open"), "Days with scheduled tasks marked with accent dot");
  await click(day(later));
  check(day(later)?.getAttribute("aria-pressed") === "true" && detail().dataset.date === later, "Selected day matches date on right");
  check($(".todo-day-row--scheduled")?.textContent === "Submit in 3 days", "Clicking future day shows todos scheduled for that day");
  const input = $<HTMLInputElement>(".todo-calendar__add input")!;
  check(input.placeholder === "Add todo", "Input placeholder shows \"Add todo\"");
  await type(input, "Bring contract");
  await act(async () => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); });
  const stored = JSON.parse(localStorage.getItem("skerry-scheduled-todos") ?? "[]") as { title: string; date: string }[];
  check(stored.some((todo) => todo.title === "Bring contract" && todo.date === later) && $$(".todo-day-row--scheduled").length === 2,
    "Entering todo and pressing Enter on future day schedules it for that day");
  await click(button("Delete scheduled task: Bring contract"));
  check($$(".todo-day-row--scheduled").length === 1 && !localStorage.getItem("skerry-scheduled-todos")!.includes("Bring contract"),
    "A scheduled task can be deleted from that day's list");

  for (let step = 0; step < 3 && !day(older); step += 1) await click(button("Previous month"));
  await click(day(older));
  check(dayList().textContent!.includes("Tidy desktop") && $(".todo-calendar__add") === null, "Past days are read-only without input box");

  const title = $(".todo-calendar__title")!.textContent;
  await click(button("Next month"));
  check($(".todo-calendar__title")!.textContent !== title && detail().dataset.date === older, "Browsing months preserves selected date on right");
  await click(goToday);
  check(day(today)?.getAttribute("aria-pressed") === "true" && goToday.disabled, "Today button navigates to current month and selects today");

  for (let step = 0; step < 5 && !day(old); step += 1) await click(button("Previous month"));
  await click(day(old));
  const longList = dayList();
  longList.scrollTop = longList.scrollHeight;
  check(longList.scrollTop > 0 && fits(), "Multi-month archived list scrolls independently on right of calendar");
  await click(day(oldEarlier));
  await click(day(old));
  check(dayList().scrollTop === 0, "Switching back to long list reads from beginning");
  await click(goToday);

  // A six-week month stays fully visible without taking height from the day list.
  for (let step = 0; step < 12 && $$(".todo-calendar__day").length !== 42; step += 1) await click(button("Next month"));
  const grid = $(".todo-calendar__grid")!;
  check($$(".todo-calendar__day").length === 42 && grid.scrollHeight <= grid.clientHeight + 1 && sideBySide() && fits() && dayList().clientHeight >= 150,
    `A six-week month is fully visible, with a ${dayList().clientHeight}px day list on the right`);
  const fixture = $("#fixture")!;
  fixture.style.width = "360px";
  check(sideBySide() && fits() && detail().scrollWidth <= detail().clientWidth + 1, "Calendar and todos do not horizontally overflow in narrow panel");
  fixture.style.removeProperty("width");
  if (!goToday.disabled) await click(goToday);
  await click(segment("today"));
  check(todayTitles().includes("Write report") && $<HTMLProgressElement>(".todo-notebook progress")?.max === 5, "Total count includes restored todos when returning to Todos page");

  const archived = JSON.parse(localStorage.getItem("skerry-archives") ?? "[]") as typeof archives;
  check(archived.length === archives.length && archived.every((entry, index) => entry.date === archives[index].date &&
    JSON.stringify(entry.todos) === JSON.stringify(archives[index].todos) && entry.dailyNote === archives[index].dailyNote), "Archived data is kept as it was");

  results.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
  results.dataset.result = "passed";
} catch (error) {
  results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
  results.dataset.result = "failed";
  console.error(error);
}
