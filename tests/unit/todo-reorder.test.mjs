import test from "node:test";
import assert from "node:assert/strict";
import { reorderIndex } from "../../src/features/todos/reorderIndex.ts";

for (const [name, mids, y, source, expected] of [
  ["drag upward", [20, 60, 100], 35, 3, 1],
  ["drag downward", [60, 100, 140], 120, 0, 2],
  ["drag above first row", [20, 60], -100, 2, 0],
  ["drag below last row", [60, 100], 900, 0, 2],
  ["stay in place", [20, 100], 60, 1, 1],
  ["single item", [], 900, 0, 0],
]) test(name, () => assert.equal(reorderIndex(mids, y, source), expected));
