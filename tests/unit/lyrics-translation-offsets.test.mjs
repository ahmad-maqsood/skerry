import assert from "node:assert/strict";
import test from "node:test";
import { parseLrc, withTranslations } from "../../src/features/media/lyrics/lrc.ts";
import { MAX_SONG_OFFSETS, normalizeSongOffsets, setSongOffset } from "../../src/features/media/lyrics/songOffsets.ts";
import { normalizeSettings } from "../../src/features/appearance/settings.ts";

test("each line takes the translation that starts with it", () => {
  const lines = parseLrc("[00:17.51]Oh I believe\n[00:22.00]in yesterday\n[00:30.00]");
  const translated = withTranslations(lines, parseLrc("[00:17.52]Oh, I do believe\n[00:30.00]Should not appear"));
  assert.deepEqual(translated, [
    { timeMs: 17_510, text: "Oh I believe", translation: "Oh, I do believe" },
    { timeMs: 22_000, text: "in yesterday" },
    { timeMs: 30_000, text: "" },
  ]);
  assert.equal(withTranslations(lines, []), lines);
});

test("per-song offsets are kept in range, and 0 or the oldest drop out", () => {
  let offsets = setSongOffset({}, "Lingering Scent", 1500);
  offsets = setSongOffset(offsets, "Sunny", -99_999);
  assert.deepEqual(offsets, { "Lingering Scent": 1500, "Sunny": -10_000 });
  assert.deepEqual(setSongOffset(offsets, "Lingering Scent", 0), { "Sunny": -10_000 });
  let many = {};
  for (let index = 0; index < MAX_SONG_OFFSETS + 3; index += 1) many = setSongOffset(many, String(index), 500);
  assert.equal(Object.keys(many).length, MAX_SONG_OFFSETS);
  assert.equal("0" in many, false);
  assert.deepEqual(normalizeSongOffsets({ a: 1234, b: "x", c: 0 }), { a: 1200 });
  assert.deepEqual(normalizeSongOffsets([1]), {});
});


