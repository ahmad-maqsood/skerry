import assert from "node:assert/strict";
import test from "node:test";
import {
  scrollingPoints,
  seriesRange,
  smoothPath,
  valueToY,
  windowSeries,
} from "../../src/features/system-monitor/sparklineGeometry.ts";

test("a short history is padded on the left so the chart is always full", () => {
  assert.deepEqual(windowSeries([5, 7], 4), [5, 5, 5, 7]);
  assert.deepEqual(windowSeries([], 3), [0, 0, 0]);
  assert.deepEqual(windowSeries([1, 2, 3, 4, 5], 3), [3, 4, 5]);
});

test("a steady percentage still gets a visible range, clamped to 0..ceiling", () => {
  const steady = seriesRange([49, 49, 49], 100, 14);
  assert.equal(steady.hi - steady.lo, 14);
  assert.ok(steady.lo < 49 && steady.hi > 49);
  const nearTop = seriesRange([99, 100], 100, 14);
  assert.equal(nearTop.hi, 100);
  assert.equal(nearTop.lo, 86);
  const nearZero = seriesRange([0, 1], 100, 14);
  assert.equal(nearZero.lo, 0);
});

test("rates are drawn from zero to their peak", () => {
  assert.deepEqual(seriesRange([0, 50, 20], undefined, 14), { lo: 0, hi: 50 });
  assert.deepEqual(seriesRange([0, 0], undefined, 14), { lo: 0, hi: 1 });
});

test("values map into the padded height, higher values nearer the top", () => {
  const range = { lo: 0, hi: 10 };
  assert.equal(valueToY(0, range, 30, 2), 28);
  assert.equal(valueToY(10, range, 30, 2), 2);
  assert.equal(valueToY(99, range, 30, 2), 2);
});

test("the smooth curve passes through every point and never overshoots a peak", () => {
  const points = [{ x: 0, y: 10 }, { x: 10, y: 2 }, { x: 20, y: 10 }, { x: 30, y: 10 }];
  const path = smoothPath(points);
  assert.ok(path.startsWith("M 0.00,10.00 C"));
  assert.ok(path.endsWith("30.00,10.00"));
  const numbers = path.match(/-?\d+\.\d+/g).map(Number);
  for (let i = 1; i < numbers.length; i += 2) {
    assert.ok(numbers[i] >= 2 - 1e-6 && numbers[i] <= 10 + 1e-6, `y ${numbers[i]} stays within the data`);
  }
});

test("scrolling starts on the old chart and ends on the new one", () => {
  const previous = [1, 2, 3, 4];
  const next = [2, 3, 4, 9];
  const range = { lo: 0, hi: 10 };
  const start = scrollingPoints(previous, next, 0, 90, 30, 0, range);
  const end = scrollingPoints(previous, next, 1, 90, 30, 0, range);
  assert.equal(start.length, 5);
  assert.equal(start[0].x, 0);
  assert.equal(start[4].x, 90);
  assert.equal(start[4].y, valueToY(4, range, 30, 0));
  assert.equal(end[0].x, -30);
  assert.equal(end[4].y, valueToY(9, range, 30, 0));
  assert.equal(end[3].x, 60);
});
