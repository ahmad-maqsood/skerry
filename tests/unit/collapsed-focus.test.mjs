import assert from "node:assert/strict";
import test from "node:test";
import { isCollapsedFocused, visibleCollapsedSlots } from "../../src/windows/island/collapsedFocus.ts";

const layout = ["pulse", "clock", "text", "shelf", "music", "system"];
const timer = (over = {}) => ({ todoId: "a", endsAt: 1, durationMinutes: 15, notified: false, ...over });
const base = { hasPreview: false, todoTimer: null, showsTodo: true, layout };

test("a notification, song or other pop-up focuses the bar", () => {
  assert.equal(isCollapsedFocused({ ...base, hasPreview: true }), true);
  assert.equal(isCollapsedFocused(base), false);
});

test("a todo round that reminds or has ended focuses the bar; a running one does not", () => {
  assert.equal(isCollapsedFocused({ ...base, todoTimer: timer({ reminded: true }) }), true);
  assert.equal(isCollapsedFocused({ ...base, todoTimer: timer({ notified: true }) }), true);
  assert.equal(isCollapsedFocused({ ...base, todoTimer: timer() }), false);
});

test("a todo the bar is not showing does not focus it", () => {
  assert.equal(isCollapsedFocused({ ...base, todoTimer: timer({ reminded: true }), showsTodo: false }), false);
});

test("a layout without the text never focuses, since nothing would show the alert", () => {
  assert.equal(isCollapsedFocused({ ...base, hasPreview: true, layout: ["pulse", "clock"] }), false);
});

test("focused keeps only the text; otherwise the whole layout", () => {
  assert.deepEqual(visibleCollapsedSlots(layout, true), ["text"]);
  assert.deepEqual(visibleCollapsedSlots(layout, false), layout);
});
