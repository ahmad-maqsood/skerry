import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRunner } from "../../src/features/quick-controls/latestRunner.ts";
import {
  brightnessToPercent,
  clampPercent,
  MIN_BRIGHTNESS_PERCENT,
  percentToVolume,
  volumeToPercent,
} from "../../src/features/quick-controls/quickControls.ts";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("clampPercent keeps a whole percentage between the minimum and 100", () => {
  assert.equal(clampPercent(42.6), 43);
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(250), 100);
  assert.equal(clampPercent(0, MIN_BRIGHTNESS_PERCENT), MIN_BRIGHTNESS_PERCENT);
  assert.equal(clampPercent(Number.NaN), 0);
  assert.equal(clampPercent(Number.NaN, MIN_BRIGHTNESS_PERCENT), MIN_BRIGHTNESS_PERCENT);
});

test("volume converts between the 0 to 1 level and the slider percentage", () => {
  assert.equal(volumeToPercent(0.5), 50);
  assert.equal(volumeToPercent(1.2), 100);
  assert.equal(volumeToPercent(-1), 0);
  assert.equal(percentToVolume(50), 0.5);
  assert.equal(percentToVolume(150), 1);
  assert.equal(percentToVolume(-3), 0);
});

test("brightnessToPercent leaves a display without brightness as null", () => {
  assert.equal(brightnessToPercent(null), null);
  assert.equal(brightnessToPercent(70), 70);
  assert.equal(brightnessToPercent(0), MIN_BRIGHTNESS_PERCENT);
});

test("createLatestRunner sends only the newest value after the slider rests", async () => {
  const sent = [];
  const runner = createLatestRunner(async (value) => void sent.push(value), 20);
  runner.push(10);
  runner.push(20);
  runner.push(30);
  await sleep(60);
  assert.deepEqual(sent, [30]);
});

test("createLatestRunner never runs two calls at once and ends on the newest value", async () => {
  const sent = [];
  let running = 0;
  let overlapped = false;
  const runner = createLatestRunner(async (value) => {
    running += 1;
    if (running > 1) overlapped = true;
    sent.push(value);
    await sleep(40);
    running -= 1;
  }, 5);
  runner.push(1);
  await sleep(15);
  runner.push(2);
  runner.push(3);
  await sleep(120);
  assert.equal(overlapped, false);
  assert.deepEqual(sent, [1, 3]);
});

test("createLatestRunner.flush sends a pending value at once and survives a failing call", async () => {
  const sent = [];
  let fail = true;
  const runner = createLatestRunner(async (value) => {
    sent.push(value);
    if (fail) throw new Error("brightness is not available");
  }, 1000);
  runner.push(5);
  runner.flush();
  await sleep(10);
  fail = false;
  runner.push(6);
  runner.flush();
  await sleep(10);
  assert.deepEqual(sent, [5, 6]);
});
