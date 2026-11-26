import assert from "node:assert/strict";
import test from "node:test";
import { loadMessageSection, saveMessageSection, visibleSection } from "../../src/features/messages/messageSections.ts";

test("without plugin content only the system list is shown, whatever was chosen", () => {
  assert.equal(visibleSection(null, false), "system");
  assert.equal(visibleSection("plugins", false), "system");
});

test("the person's choice stands while plugins have content", () => {
  assert.equal(visibleSection("system", true), "system");
  assert.equal(visibleSection("plugins", true), "plugins");
});

test("with no choice, the system list is the default", () => {
  assert.equal(visibleSection(null, true), "system");
});

test("the last pick is remembered, and unreadable values are ignored", (t) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  assert.equal(loadMessageSection(), null);
  saveMessageSection("plugins");
  assert.equal(loadMessageSection(), "plugins");
  saveMessageSection("system");
  assert.equal(loadMessageSection(), "system");
  values.set("skerry-messages-section", "other");
  assert.equal(loadMessageSection(), null);
});
