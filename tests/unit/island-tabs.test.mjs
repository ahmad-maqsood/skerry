import assert from "node:assert/strict";
import test from "node:test";
import { onlyOneTabOn } from "../../src/windows/settings/islandTabs.ts";

test("the last tab that is on is held, so the island always has a page", () => {
  assert.equal(onlyOneTabOn([true, false, false]), true);
  assert.equal(onlyOneTabOn([false, false, true, false]), true);
  assert.equal(onlyOneTabOn([true, true, false]), false);
  assert.equal(onlyOneTabOn([true, true, true]), false);
  assert.equal(onlyOneTabOn([false, false]), false, "nothing on: nothing left to hold");
  assert.equal(onlyOneTabOn([]), false);
});
