// pnpm dev, then open /tests/regression/todo-edit.html. Editing a todo's title in place: a title
// that wraps keeps all its lines while edited (a one-line input showed only the first), Enter
// saves, Shift+Enter adds no line, Escape cancels.
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import "../../src/styles/fonts.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { TodoListItem } from "../../src/features/todos/TodoListItem";
import type { TodoItem } from "../../src/features/todos/types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
localStorage.setItem(LOCALE_STORAGE_KEY, "en");

const LONG_TITLE = "Organize release notes and update all settings, todo and clipboard screenshots for the next release, then review with team members for typos";
const log: string[] = [];
let todo: TodoItem = { id: "t1", title: LONG_TITLE, completed: false, createdAt: 0 };

function Harness() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [item, setItem] = useState(todo);
  const noop = () => {};
  return (
    <div className="todo-list" role="list">
      <TodoListItem
        todo={item}
        isTodayMode
        isActive={false}
        canReorder={false}
        isDragging={false}
        isEditing={editing}
        titleDraft={draft}
        onTitleDraftChange={setDraft}
        onCommitEdit={() => {
          log.push(`commit:${draft}`);
          todo = { ...item, title: draft.trim() || item.title };
          setItem(todo);
          setEditing(false);
        }}
        onCancelEdit={() => { log.push("cancel"); setEditing(false); }}
        onStartEdit={(next) => { setDraft(next.title); setEditing(true); }}
        onToggle={noop}
        onStart={noop}
        onDelete={noop}
        onDragStart={noop}
      />
    </div>
  );
}

const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const results = document.getElementById("results")!;
const field = () => document.querySelector<HTMLTextAreaElement>(".todo-title-input");
const titleButton = () => document.querySelector<HTMLButtonElement>(".todo-title--editable");
const lines = (element: HTMLElement) => Math.round(element.clientHeight / parseFloat(getComputedStyle(element).lineHeight));
const key = (init: KeyboardEventInit) => act(async () => {
  field()!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
});
/** Types into the controlled textarea the way a user would, so React sees the change. */
const type = (value: string) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  setter.call(field(), value);
  field()!.dispatchEvent(new Event("input", { bubbles: true }));
});

try {
  await act(async () => { createRoot(document.getElementById("fixture")!).render(<StrictMode><I18nProvider><Harness /></I18nProvider></StrictMode>); });
  const shownLines = lines(titleButton()!);
  check(shownLines >= 2, `Long title wrapped to multiple lines in list (${shownLines} lines)`);

  await act(async () => { titleButton()!.click(); });
  const editor = field()!;
  check(editor instanceof HTMLTextAreaElement && document.activeElement === editor && editor.value === LONG_TITLE, "Clicking title enters edit mode with focus in textarea containing full title");
  check(editor.scrollHeight <= editor.clientHeight + 1 && lines(editor) === shownLines,
    `Maintains original line count during edit with full text visible (${lines(editor)} lines / was ${shownLines} lines)`);
  check(editor.selectionStart === LONG_TITLE.length, "Cursor positioned at end of title");

  await type(`${LONG_TITLE}, and also append another long sentence to check that it wraps into another line properly`);
  check(lines(field()!) > shownLines && field()!.scrollHeight <= field()!.clientHeight + 1, `Textarea expands in height as text grows (${lines(field()!)} lines)`);
  await type("First line\nSecond line");
  check(field()!.value === "First line Second line", "Pasted newlines converted to spaces; title remains single paragraph");

  await key({ key: "Enter", shiftKey: true });
  check(field() !== null && !log.some((entry) => entry.startsWith("commit")), "Shift+Enter neither saves nor inserts newline");
  await key({ key: "Enter", isComposing: true });
  check(field() !== null && !log.some((entry) => entry.startsWith("commit")), "Enter during IME composition does not save");
  await key({ key: "Enter" });
  check(field() === null && titleButton()?.textContent === "First line Second line" && log.includes("commit:First line Second line"), "Enter saves and exits edit mode");

  await act(async () => { titleButton()!.click(); });
  await type("Unwanted changes");
  await key({ key: "Escape" });
  check(field() === null && titleButton()?.textContent === "First line Second line" && log[log.length - 1] === "cancel", "Esc cancels and preserves original title");

  results.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
  results.dataset.result = "passed";
} catch (error) {
  results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
  results.dataset.result = "failed";
  console.error(error);
}
