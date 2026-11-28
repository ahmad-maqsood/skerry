import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSourceNames, sourceDisplayName, withSourceName } from "../../src/features/media/sourceNames.ts";

test("stored names keep only non-empty text, trimmed and cut to length", () => {
  assert.deepEqual(normalizeSourceNames(null), {});
  assert.deepEqual(normalizeSourceNames([]), {});
  assert.deepEqual(normalizeSourceNames("x"), {});
  assert.deepEqual(normalizeSourceNames({ a: "  Zen  ", b: "", c: 5, d: "   " }), { a: "Zen" });
  assert.equal(normalizeSourceNames({ a: "x".repeat(80) }).a.length, 32);
});

test("naming a player replaces its name and an empty name clears it", () => {
  const named = withSourceName({}, "308046B0AF4A39CB", "Zen Browser");
  assert.deepEqual(named, { "308046B0AF4A39CB": "Zen Browser" });
  assert.deepEqual(withSourceName(named, "308046B0AF4A39CB", "Work Firefox"), { "308046B0AF4A39CB": "Work Firefox" });
  assert.deepEqual(withSourceName(named, "308046B0AF4A39CB", "  "), {});
});

test("a player is shown by the user's name, else its label, else its id", () => {
  const names = { id1: "Zen Browser" };
  assert.equal(sourceDisplayName(names, "id1", "Firefox"), "Zen Browser");
  assert.equal(sourceDisplayName(names, "id2", "Firefox"), "Firefox");
  assert.equal(sourceDisplayName(names, "id2", null), "id2");
  assert.equal(sourceDisplayName(names, null, null), "");
});
