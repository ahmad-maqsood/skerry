import assert from "node:assert/strict";
import test from "node:test";
import { centredClockBarWidth, wantsCentredClock } from "../../src/windows/island/clockPlacement.ts";

test("the clock is centred only on a quiet bar", () => {
  const quiet = { musicPlaying: false, collapsedItem: null, taskTitle: null };
  assert.equal(wantsCentredClock(quiet), true);
  assert.equal(wantsCentredClock({ ...quiet, collapsedItem: "todo" }), true, "the todo count is short");
  assert.equal(wantsCentredClock({ ...quiet, collapsedItem: "todo", taskTitle: "Write report" }), false);
  assert.equal(wantsCentredClock({ ...quiet, collapsedItem: "lyrics" }), false);
  assert.equal(wantsCentredClock({ ...quiet, musicPlaying: true }), false);
});

test("both halves get the room of the fuller side, so nothing reaches under the clock", () => {
  const sizes = { clock: 48, padding: 18, gap: 8 };
  const width = centredClockBarWidth({ ...sizes, left: 100, right: 24 });
  assert.equal(width, 300);
  assert.equal(centredClockBarWidth({ ...sizes, left: 24, right: 100 }), width);
  assert.ok((width - sizes.clock) / 2 >= sizes.padding + 100 + sizes.gap);
});
