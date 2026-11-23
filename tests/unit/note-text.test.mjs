import assert from "node:assert/strict";
import test from "node:test";
import { formatNoteTime, insertInline } from "../../src/features/todos/noteText.ts";

test("the time goes in at the caret with a space on each side that needs one", () => {
  assert.deepEqual(insertInline("", 0, 0, "14:05"), { value: "14:05 ", caret: 6 });
  assert.deepEqual(insertInline("met Sam", 7, 7, "14:05"), { value: "met Sam 14:05 ", caret: 14 });
  assert.deepEqual(insertInline("met Sam ", 8, 8, "14:05"), { value: "met Sam 14:05 ", caret: 14 });
  assert.deepEqual(insertInline("a\nb", 2, 2, "14:05"), { value: "a\n14:05 b", caret: 8 });
  assert.deepEqual(insertInline("ab", 1, 1, "14:05"), { value: "a 14:05 b", caret: 8 });
});

test("a selection is replaced and positions outside the text are clamped", () => {
  assert.equal(insertInline("lunch at noon", 9, 13, "12:30").value, "lunch at 12:30 ");
  assert.equal(insertInline("abc", 50, 60, "9:00").value, "abc 9:00 ");
  assert.equal(insertInline("abc", -3, -1, "9:00").value, "9:00 abc");
});

test("the time is written the way the language writes it", () => {
  const afternoon = new Date(2026, 10, 23, 14, 5);
  assert.equal(formatNoteTime(afternoon, "en-GB"), "14:05");
  assert.match(formatNoteTime(afternoon, "en-US"), /^2:05\s?PM$/);
});
