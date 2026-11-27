import test from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_LAUNCH_PIXEL_CAT,
  PIXEL_CAT_LANE_WIDTH,
  normalizePixelCatSettings,
  pixelCatWidth,
  slotsHiddenWithCat,
} from "../../src/features/pixel-cat/model.ts";
import {
  SPRITE_HEIGHT,
  SPRITE_ROWS,
  SPRITE_WIDTH,
  BODY_RUNS,
  STRIDE_RUNS,
  TOGETHER_RUNS,
  spriteRuns,
  POSE_ROWS,
  BLINK_PIXEL,
} from "../../src/features/pixel-cat/sprite.ts";

test("the pixel cat is off unless it was switched on", () => {
  for (const value of [undefined, null, [], "bad", 1, {}, { enabled: "true" }, { enabled: 1 }]) {
    assert.deepEqual(normalizePixelCatSettings(value), { enabled: false });
  }
  assert.deepEqual(normalizePixelCatSettings({ enabled: true }), { enabled: true });
});

test("a fresh install starts with the cat on, and a missing key on an older install stays off", () => {
  assert.deepEqual(FIRST_LAUNCH_PIXEL_CAT, { enabled: true });
  assert.deepEqual(normalizePixelCatSettings(undefined), { enabled: false });
});

test("the cat's lane widens the island within what the window accepts", () => {
  assert.equal(pixelCatWidth(200), 200 + PIXEL_CAT_LANE_WIDTH + 8);
  assert.equal(pixelCatWidth(200.2), 321);
  assert.equal(pixelCatWidth(450), 480);
  // The measured status icons set a floor, but never past the widest island.
  assert.equal(pixelCatWidth(100, 400), 400);
  assert.equal(pixelCatWidth(100, 600), 480);
});

test("the clock's slot stays on the island while the cat is on", () => {
  const hidden = ["clock", "weather"];
  assert.deepEqual(slotsHiddenWithCat(hidden, false), ["clock", "weather"]);
  assert.deepEqual(slotsHiddenWithCat(hidden, true), ["weather"]);
});

test("every sprite row is the same width and the grid has the height the component draws", () => {
  assert.equal(SPRITE_ROWS.length, SPRITE_HEIGHT + 2);
  for (const row of SPRITE_ROWS) assert.equal(row.length, SPRITE_WIDTH);
  for (const run of [...BODY_RUNS, ...STRIDE_RUNS, ...TOGETHER_RUNS]) {
    assert.ok(run.x >= 0 && run.x + run.width <= SPRITE_WIDTH);
    assert.ok(run.y >= 0 && run.y < SPRITE_HEIGHT);
  }
});

test("sprite runs join neighbouring pixels of one kind and split at other kinds and gaps", () => {
  assert.deepEqual(spriteRuns(["kk.kekp"], 3), [
    { x: 0, y: 3, width: 2, kind: "fur" },
    { x: 3, y: 3, width: 1, kind: "fur" },
    { x: 4, y: 3, width: 1, kind: "eye" },
    { x: 5, y: 3, width: 1, kind: "fur" },
    { x: 6, y: 3, width: 1, kind: "nose" },
  ]);
  assert.deepEqual(spriteRuns(["...."]), []);
});

test("the cat has one eye and one nose, and the two leg poses sit below the body", () => {
  assert.equal(BODY_RUNS.filter((run) => run.kind === "eye").length, 1);
  assert.equal(BODY_RUNS.filter((run) => run.kind === "nose").length, 1);
  const bodyRows = Math.max(...BODY_RUNS.map((run) => run.y));
  for (const run of [...STRIDE_RUNS, ...TOGETHER_RUNS]) assert.ok(run.y > bodyRows);
});

test("every extra pose fits the same grid, and the blink lands on the sitting eye", () => {
  for (const [name, rows] of Object.entries(POSE_ROWS)) {
    assert.equal(rows.length, SPRITE_HEIGHT, name);
    for (const row of rows) assert.equal(row.length, SPRITE_WIDTH, name);
  }
  for (const rows of [SPRITE_ROWS, POSE_ROWS.sitTailDown, POSE_ROWS.sitTailUp]) {
    assert.equal(rows[BLINK_PIXEL.y][BLINK_PIXEL.x], "e");
  }
});
