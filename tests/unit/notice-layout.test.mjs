import assert from "node:assert/strict";
import test from "node:test";
import { getNoticeSize } from "../../src/windows/island/noticeLayout.ts";
import { noticeText } from "../../src/features/messages/messagePreview.ts";

const limits = { maxWidth: 520, maxHeight: 180, baseWidth: 340, baseHeight: 38, fontScale: 1, collapsedScale: 1 };

test("a message that fits the one-line preview does not grow the island", () => {
  assert.equal(getNoticeSize({ sender: "Alice", body: "OK" }, limits), null);
});

test("a longer message widens the island first, then wraps and grows taller", () => {
  const medium = getNoticeSize({ sender: "Alice", body: "Meeting tomorrow at 3 PM in room 302" }, limits);
  assert.ok(medium && medium.width > limits.baseWidth && medium.width <= limits.maxWidth);
  assert.equal(medium.reader, false);
  assert.equal(medium.height, limits.baseHeight);
  const long = getNoticeSize({ sender: "Alice", body: "This is a very long notification message that tests reader expansion. ".repeat(12) }, limits);
  assert.equal(long.width, 516);
  assert.equal(long.reader, true);
  assert.ok(long.height > medium.height && long.height <= limits.maxHeight);
});

test("past the limits the reader scrolls, and the stage bounds the size at any scale", () => {
  const huge = getNoticeSize({ sender: "Team", body: "Very long message body text. ".repeat(200) }, limits);
  assert.equal(huge.height, 180);
  assert.equal(huge.scrolls, true);
  const scaled = getNoticeSize({ sender: "Team", body: "Very long message body text. ".repeat(200) }, { ...limits, maxWidth: 720, maxHeight: 360, collapsedScale: 1.4 });
  assert.ok(scaled.width * 1.4 <= 780 && scaled.height * 1.4 <= 436);
  assert.equal((scaled.width - 4) % 8, 0);
});

test("line breaks in a message each start a line", () => {
  const lines = getNoticeSize({ sender: "a", body: "1\n2\n3\n4" }, limits);
  const one = getNoticeSize({ sender: "a", body: "1\n2" }, limits);
  assert.ok(lines.height > one.height);
});

test("mail always has a reader, preserving blank lines and respecting a smaller maximum width", () => {
  const mail = getNoticeSize({ sender: "Mail", body: "Code 123456" }, { ...limits, forceReader: true });
  assert.equal(mail.reader, true);
  assert.ok(mail.height > limits.baseHeight);
  const narrow = getNoticeSize({ sender: "Mail", body: "Long text ".repeat(60) }, { ...limits, baseWidth: 480, maxWidth: 320 });
  assert.ok(narrow.width <= 320);
  const blank = getNoticeSize({ sender: "Mail", body: "a\n\n\nb" }, limits);
  const plain = getNoticeSize({ sender: "Mail", body: "a\nb" }, limits);
  assert.ok(blank.height > plain.height);
});

test("game notice opt-in overrides tuck preferences only while quiet", async () => {
  const { canPreviewNotice } = await import("../../src/windows/island/noticeRules.ts");
  const settings = { gameShowNotices: false, revealOnMessage: false };
  assert.equal(canPreviewNotice(settings, true, "collapsed", false), false);
  assert.equal(canPreviewNotice({ ...settings, gameShowNotices: true }, true, "collapsed", true), true);
  assert.equal(canPreviewNotice({ ...settings, gameShowNotices: true }, false, "collapsed", true), false);
  assert.equal(canPreviewNotice({ ...settings, gameShowNotices: true }, true, "expanded", false), false);
});

test("notice text keeps the sender apart from the whole message", () => {
  assert.deepEqual(
    noticeText({ id: "1", appId: "GitHub", appDisplayName: "GitHub", title: "Alice", body: "Your PR was merged", timestamp: 1, receivedAt: 1 }),
    { sender: "GitHub · Alice", body: "Your PR was merged" },
  );
});

test("preview seconds: game mode's own while quiet, the adaptive preview's, else the usual", async () => {
  const { previewSecondsFor, noticePassesClicks } = await import("../../src/windows/island/noticeRules.ts");
  const settings = { messagePreviewSeconds: 5, messageAutoExpand: false, messageExpandSeconds: 12, gameShowNotices: true, gameNoticeSeconds: 3 };
  assert.equal(previewSecondsFor(settings, false), 5);
  assert.equal(previewSecondsFor({ ...settings, messageAutoExpand: true }, false), 12);
  assert.equal(previewSecondsFor({ ...settings, messageAutoExpand: true }, true), 3);
  assert.equal(previewSecondsFor({ ...settings, gameShowNotices: false }, true), 5);
  assert.equal(noticePassesClicks(true, true, "collapsed"), true);
  assert.equal(noticePassesClicks(true, false, "collapsed"), false);
  assert.equal(noticePassesClicks(false, true, "collapsed"), false);
});

test("each kind of preview expands only when the switch for its kind is on", async () => {
  const { expandsPreview, previewSecondsFor } = await import("../../src/windows/island/noticeRules.ts");
  const all = { messageAutoExpand: true, messageExpandApps: true, messageExpandClipboard: true, messageExpandMusic: true, messageExpandCharger: true };
  for (const kind of [undefined, "clipboard", "music", "battery"]) {
    assert.equal(expandsPreview(all, kind), true, String(kind));
    assert.equal(expandsPreview({ ...all, messageAutoExpand: false }, kind), false, `${kind} with the master switch off`);
  }
  assert.equal(expandsPreview({ ...all, messageExpandMusic: false }, "music"), false);
  assert.equal(expandsPreview({ ...all, messageExpandMusic: false }, "clipboard"), true);
  assert.equal(expandsPreview({ ...all, messageExpandApps: false }, undefined), false);
  assert.equal(expandsPreview({ ...all, messageExpandApps: false }, "battery"), true);
  assert.equal(expandsPreview({ ...all, messageExpandClipboard: false }, "clipboard"), false);
  assert.equal(expandsPreview({ ...all, messageExpandCharger: false }, "battery"), false);
  // A preview that does not expand stays for the usual seconds, not the expanded ones.
  const seconds = { messagePreviewSeconds: 5, messageAutoExpand: true, messageExpandSeconds: 12, gameShowNotices: false, gameNoticeSeconds: 3 };
  assert.equal(previewSecondsFor(seconds, false, true), 12);
  assert.equal(previewSecondsFor(seconds, false, false), 5);
});

test("game mode previews only when asked to; otherwise a tucked island needs reveal-on-message", async () => {
  const { canPreviewNotice } = await import("../../src/windows/island/noticeRules.ts");
  const on = { gameShowNotices: true, revealOnMessage: false };
  assert.equal(canPreviewNotice(on, true, "collapsed", true), true);
  assert.equal(canPreviewNotice({ ...on, gameShowNotices: false }, true, "collapsed", false), false);
  assert.equal(canPreviewNotice(on, false, "collapsed", true), false);
  assert.equal(canPreviewNotice({ ...on, revealOnMessage: true }, false, "collapsed", true), true);
  assert.equal(canPreviewNotice(on, true, "expanded", false), false);
});

test("what the laid-out preview still overflowed by grows the island past the estimate", () => {
  // The estimate says it fits; status icons beside the text cut it off, as measured.
  const short = { sender: "Alice", body: "OK" };
  assert.equal(getNoticeSize(short, limits), null);
  const widened = getNoticeSize(short, { ...limits, measuredOverflow: 60 });
  assert.ok(widened && widened.width >= limits.baseWidth + 60 && widened.reader === false);
  // Past the width limit it turns into the reader instead of staying cut off.
  const medium = { sender: "Alice", body: "Meeting tomorrow at 3 PM in room 302" };
  assert.equal(getNoticeSize(medium, { ...limits, measuredOverflow: 300 }).reader, true);
});

test("a short message's reader is only as wide as the message, even narrower than a wide island", () => {
  const short = getNoticeSize({ sender: "Bob", body: "Got a new phone" }, { ...limits, baseWidth: 480, forceReader: true });
  assert.ok(short.reader && short.width < 480 && short.width >= 240);
  const long = getNoticeSize({ sender: "Bob", body: "Meeting tomorrow at 3 PM in conference room on 3rd floor for project review, please prepare materials. ".repeat(2) }, { ...limits, baseWidth: 480, forceReader: true });
  assert.ok(long.width > short.width);
});

test("short status pop-ups widen the one-line bar and never become a reader", async () => {
  const { widensToFit } = await import("../../src/windows/island/noticeRules.ts");
  for (const kind of ["battery", "bluetooth", "airplane"]) assert.equal(widensToFit(kind), true, kind);
  for (const kind of [undefined, "clipboard", "music", "volume", "brightness"]) assert.equal(widensToFit(kind), false, String(kind));
  const narrow = { ...limits, baseWidth: 240, oneLineOnly: true };
  const charger = { sender: "Charger plugged in", body: "90%" };
  // Cut off as laid out, so the island grows by at least what was measured.
  const widened = getNoticeSize(charger, { ...narrow, measuredOverflow: 70 });
  assert.ok(widened.width >= 310 && widened.reader === false);
  assert.equal(widened.height, narrow.baseHeight);
  const endless = getNoticeSize({ sender: "Very long device name ".repeat(20), body: "Connected" }, narrow);
  assert.ok(endless.reader === false && endless.width <= narrow.maxWidth);
});
