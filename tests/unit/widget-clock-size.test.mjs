import assert from "node:assert/strict";
import test from "node:test";
import { CLOCK_WIDTH, clockScale, clockWindowSize, normalizeClockWidth } from "../../src/features/widgets/clock/size.ts";

test("a stored width within range is kept, rounded to a whole pixel", () => {
  assert.equal(normalizeClockWidth(700), 700);
  assert.equal(normalizeClockWidth(700.6), 701);
});

test("a width outside the range is pulled in, and damaged values read as the default", () => {
  assert.equal(normalizeClockWidth(10), CLOCK_WIDTH.min);
  assert.equal(normalizeClockWidth(99999), CLOCK_WIDTH.max);
  for (const damaged of [undefined, null, "700", NaN, Infinity, {}]) {
    assert.equal(normalizeClockWidth(damaged), CLOCK_WIDTH.default);
  }
});

test("the default width draws the widget as designed, and the height keeps its proportion", () => {
  assert.equal(clockScale(CLOCK_WIDTH.default), 1);
  assert.deepEqual(clockWindowSize(CLOCK_WIDTH.default), { width: 560, height: 230 });
  assert.deepEqual(clockWindowSize(280), { width: 280, height: 115 });
  assert.equal(clockScale(280), 0.5);
});
