import assert from "node:assert/strict";
import test from "node:test";
import { hasGlyph, layoutWord } from "../../src/features/widgets/clock/glyphs.ts";
import { clockLines, msUntilNextMinute } from "../../src/features/widgets/clock/text.ts";
import { contrastBetween, customInk, FALLBACK_INK, pickInk } from "../../src/features/widgets/clock/ink.ts";
import { DEFAULT_CLOCK_COLOR, normalizeClockColor } from "../../src/features/widgets/clock/storage.ts";

const names = {
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

test("the three lines read like the widget: capital weekday, day month, year and 24-hour time", () => {
  assert.deepEqual(clockLines(new Date(2026, 10, 19, 23, 27, 5), names), {
    weekday: "THURSDAY",
    date: "19 NOVEMBER, 2026.",
    time: "23:27",
  });
  assert.equal(clockLines(new Date(2026, 0, 4, 7, 5), names).time, "07:05");
  assert.equal(clockLines(new Date(2026, 0, 4, 7, 5), names).weekday, "SUNDAY");
});

test("the clock ticks again just after the minute changes", () => {
  assert.equal(msUntilNextMinute(new Date(2026, 10, 19, 23, 27, 0, 0)), 60_050);
  assert.equal(msUntilNextMinute(new Date(2026, 10, 19, 23, 27, 59, 900)), 150);
});

test("every letter of the seven weekdays has a glyph and the layout is gapped", () => {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  for (const day of days) {
    assert.ok([...day].every(hasGlyph), day);
    assert.equal(layoutWord(day).glyphs.length, day.length);
  }
  const thursday = layoutWord("Thursday");
  assert.equal(thursday.width, 8 * 40 - 0 + 7 * 14);
  assert.deepEqual(thursday.glyphs.slice(0, 2).map((glyph) => glyph.x), [0, 54]);
  assert.equal(layoutWord("Q").glyphs.length, 0);
});

test("a red accent on a pale screen stays red, darkened only as far as needed", () => {
  const ink = pickInk({ luminance: 0.85, average: [230, 228, 226], accent: [228, 30, 40] });
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(ink.color.slice(index, index + 2), 16));
  assert.ok(r > g * 2 && r > b * 2, ink.color);
  assert.ok(contrastBetween(0.2126 * ((r / 255) ** 2.2) + 0.7152 * ((g / 255) ** 2.2) + 0.0722 * ((b / 255) ** 2.2), 0.85) > 4);
});

test("a dark screen gets light ink and a pale one dark ink when there is no accent", () => {
  assert.equal(pickInk({ luminance: 0.01, average: [5, 5, 8], accent: null }).color, "#fafafc");
  assert.equal(pickInk({ luminance: 0.9, average: [240, 240, 240], accent: null }).color, "#141418");
});

test("an accent too close to the background is lightened or darkened until it reads", () => {
  const dark = pickInk({ luminance: 0.02, average: [10, 10, 14], accent: [40, 10, 20] }).color;
  assert.notEqual(dark, "#280a14");
  assert.ok(parseInt(dark.slice(1, 3), 16) > 150, dark);
});

test("no backdrop or a damaged one falls back to white ink", () => {
  assert.deepEqual(pickInk(null), FALLBACK_INK);
  assert.deepEqual(pickInk({ luminance: Number.NaN, average: [0, 0, 0], accent: null }), FALLBACK_INK);
});

test("a picked colour is drawn as picked, with a halo that contrasts with it", () => {
  assert.deepEqual(customInk("#FFE08A"), { color: "#FFE08A", shadow: "0 1px 5px rgba(0, 0, 0, 0.45)" });
  assert.deepEqual(customInk("#101030"), { color: "#101030", shadow: "0 1px 5px rgba(255, 255, 255, 0.35)" });
});

test("the saved clock colour falls back to the default field by field", () => {
  for (const damaged of [undefined, null, "custom", 7, {}]) {
    assert.deepEqual(normalizeClockColor(damaged), DEFAULT_CLOCK_COLOR);
  }
  assert.deepEqual(normalizeClockColor({ mode: "custom", color: "#ab12cd" }), { mode: "custom", color: "#AB12CD" });
  assert.deepEqual(normalizeClockColor({ mode: "custom", color: "red" }), { mode: "custom", color: "#FFFFFF" });
  assert.deepEqual(normalizeClockColor({ mode: "neon", color: "#000000" }), { mode: "auto", color: "#000000" });
});
