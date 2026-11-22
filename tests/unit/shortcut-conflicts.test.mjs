import assert from "node:assert/strict";
import test from "node:test";
import { findShortcutOwner, shortcutKey } from "../../src/windows/settings/shortcutConflicts.ts";

const owners = [
  { id: "window", label: "Open quick translate", shortcut: "Ctrl+Alt+Space" },
  { id: "selection", label: "Translate selected text", shortcut: "Ctrl+Alt+T" },
  { id: "clipboard", label: "Expand shortcut", shortcut: "Ctrl+Shift+W" },
];

test("shortcut keys ignore case, spacing and modifier order", () => {
  assert.equal(shortcutKey("ctrl + alt+t"), shortcutKey("Alt+Ctrl+T"));
  assert.equal(shortcutKey("Control+Shift+W"), shortcutKey("Ctrl+Shift+W"));
  assert.notEqual(shortcutKey("Ctrl+T"), shortcutKey("Ctrl+Alt+T"));
});

test("a shortcut held by another row names that row", () => {
  assert.equal(findShortcutOwner("Alt+Ctrl+T", owners, "clipboard"), "Translate selected text");
});

test("a row keeping its own shortcut, or a free shortcut, has no owner", () => {
  assert.equal(findShortcutOwner("Ctrl+Alt+T", owners, "selection"), null);
  assert.equal(findShortcutOwner("Ctrl+Alt+Q", owners, "selection"), null);
});
