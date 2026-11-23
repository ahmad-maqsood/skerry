import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "../../src/i18n";
import { TodoNotebookTasks } from "../../src/features/todos/TodoNotebookTasks";
import { useTodoList } from "../../src/features/todos/useTodoList";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import "../../src/features/todos/TodoNotebook.css";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const noop = () => {};
let moves: [string, number][] = [];
function Harness() {
  const list = useTodoList(noop);
  return <TodoNotebookTasks displayedTodos={list.todos} draft="" draftDate={null}
    currentDate="2026-11-12" activeTodoId={null} enableTodoReorder scrollStartRows={3}
    onDraftChange={noop} onDraftDateChange={noop} onAddTodo={noop} onToggleTodo={noop}
    onUpdateTodo={noop} onStartTodo={noop} onDeleteTodo={noop}
    onReorderTodo={(id, index) => { moves.push([id, index]); list.moveTodoToIndex(id, index); }} />;
}
const messages: string[] = [];
const results = document.getElementById("results")!;
const order = () => [...document.querySelectorAll<HTMLElement>("[data-todo-id]")].map((row) => row.dataset.todoId).join(",");
function check(value: unknown, label: string) {
  if (!value) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const row = (id: string) => document.querySelector<HTMLElement>(`[data-todo-id="${id}"]`)!;
const handle = (id: string) => row(id).querySelector<HTMLButtonElement>(".todo-drag-handle")!;
async function pointer(id: string, type: string, y: number) {
  await act(async () => {
    handle(id).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
      pointerId: 1, button: 0, clientX: 450, clientY: y }));
  });
}
async function frame() {
  await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
}
async function waitForDropAnimation(row: HTMLElement) {
  await act(async () => {
    const deadline = performance.now() + 1000;
    while (performance.now() < deadline) {
      const animationsFinished = row.getAnimations().every((animation) => animation.playState === "finished");
      if (animationsFinished && !row.dataset.todoSettling && !row.style.transform) return;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  });
}

try {
  // This regression page uses its own test data only.
  localStorage.setItem("skerry-todos", JSON.stringify(["a", "b", "c"].map((id) => ({
    id, title: id, completed: false, createdAt: 0,
  }))));
  await act(async () => {
    createRoot(document.getElementById("fixture")!).render(<StrictMode><I18nProvider><Harness /></I18nProvider></StrictMode>);
  });
  check(order() === "a,b,c", "Initial order");
  let y = row("a").getBoundingClientRect().top + 16;
  await pointer("a", "pointerdown", y);
  await pointer("a", "pointermove", y + 2);
  await frame();
  check(!row("a").classList.contains("todo-item--dragging"), "Dragging does not start within 4px");
  y = row("c").getBoundingClientRect().bottom + 10;
  await pointer("a", "pointermove", y);
  await frame();
  check(order() === "b,c,a", "DOM order updates in real time during drag");
  check(moves.length === 0, "Preview does not commit real order");
  check(row("a").style.transform.includes("translateY"), "Dragged row follows pointer via inline transform");
  await pointer("a", "pointerup", y);
  check(order() === "b,c,a" && JSON.stringify(moves) === '[["a",2]]', "Pointer up commits final index");
  check(JSON.parse(localStorage.getItem("skerry-todos")!).map((item: { id: string }) => item.id).join(",") === "b,c,a", "Released order is persisted");
  await waitForDropAnimation(row("a"));
  check(!row("a").style.transform && !row("a").dataset.todoSettling && row("a").getAnimations().every((animation) => animation.playState === "finished"), "Transform cleaned up after drop animation");
  moves = [];
  y = row("a").getBoundingClientRect().top + 16;
  await pointer("a", "pointerdown", y);
  await pointer("a", "pointermove", row("b").getBoundingClientRect().top - 10);
  await frame();
  check(order() === "a,b,c", "Real-time preview when dragging upward");
  await pointer("a", "pointercancel", y);
  check(order() === "b,c,a" && moves.length === 0, "pointercancel restores original order and does not commit");
  await pointer("a", "pointerdown", y);
  await pointer("a", "pointermove", row("b").getBoundingClientRect().top - 10);
  await frame();
  await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
  check(order() === "b,c,a" && moves.length === 0, "Esc discards preview");
  // When dragging downward, the dragged row is detached and reinserted into the DOM, losing pointer capture; subsequent pointer events falling elsewhere must still follow and release cleanly.
  const away = async (type: string, y: number) => act(async () => {
    document.body.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, button: 0, clientX: 450, clientY: y }));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 220)); });
  const startY = row("b").getBoundingClientRect().top + 4;
  await pointer("b", "pointerdown", startY);
  const bottom = row("a").getBoundingClientRect().bottom - 2;
  await away("pointermove", bottom);
  await frame();
  check(order() === "c,a,b", "Still swaps positions in real time after pointer leaves handle");
  await away("pointerup", bottom);
  check(JSON.stringify(moves[moves.length - 1]) === '["b",2]' && !row("b").classList.contains("todo-item--dragging"), "Pointer up after leaving handle still settles cleanly without getting stuck");
  results.textContent = messages.join("\n");
  results.dataset.result = "passed";
} catch (error) {
  results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
  results.dataset.result = "failed";
}
