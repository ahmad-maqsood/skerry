import assert from "node:assert/strict";
import test from "node:test";
import { visibleSection } from "../../src/features/messages/messageSections.ts";

test("without plugin content only the system list is shown, whatever was chosen", () => {
  assert.equal(visibleSection(null, 0, false), "system");
  assert.equal(visibleSection("plugins", 3, false), "system");
});

test("the person's choice stands while plugins have content", () => {
  assert.equal(visibleSection("system", 0, true), "system");
  assert.equal(visibleSection("plugins", 5, true), "plugins");
});

test("with no choice, plugins open first only when there is nothing in the system list", () => {
  assert.equal(visibleSection(null, 0, true), "plugins");
  assert.equal(visibleSection(null, 2, true), "system");
});
