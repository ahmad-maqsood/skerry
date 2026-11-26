import assert from "node:assert/strict";
import test from "node:test";
import { nextPluginPopup, normalizePopupsOff, withPluginPopup } from "../../src/features/plugins/pluginPopups.ts";
import { previewPage } from "../../src/windows/island/noticeRules.ts";
import { previewPriority } from "../../src/features/messages/messagePreview.ts";

const note = (id, receivedAt, pluginId = "github") => ({ pluginId, id, sourceId: pluginId, appName: "GitHub", icon: "github", title: id, body: "", receivedAt, action: null });
const none = new Set();

test("saved pop-up preferences keep only plugin ids, once each", () => {
  assert.deepEqual(normalizePopupsOff(["github", "github", "", 3, null, "other"]), ["github", "other"]);
  assert.deepEqual(normalizePopupsOff("github"), []);
  assert.deepEqual(normalizePopupsOff(undefined), []);
});

test("switching a plugin's pop-ups off lists it, and on removes it", () => {
  assert.deepEqual(withPluginPopup([], "github", false), ["github"]);
  assert.deepEqual(withPluginPopup(["github"], "github", false), ["github"]);
  assert.deepEqual(withPluginPopup(["github", "other"], "github", true), ["other"]);
});

test("a notification the island has not seen pops up once", () => {
  const first = nextPluginPopup(none, [note("a", 2000)], none, 1000);
  assert.equal(first.popup?.id, "a");
  const again = nextPluginPopup(first.seen, [note("a", 2000)], none, 1000);
  assert.equal(again.popup, null, "the same id is not announced twice");
});

test("only the newest of several new notifications pops up, and all count as seen", () => {
  const batch = [note("old", 2000), note("new", 3000), note("mid", 2500)];
  const result = nextPluginPopup(none, batch, none, 1000);
  assert.equal(result.popup?.id, "new");
  assert.equal(nextPluginPopup(result.seen, batch, none, 1000).popup, null);
});

test("what a plugin already knew when the island started is not news", () => {
  const result = nextPluginPopup(none, [note("before", 999)], none, 1000);
  assert.equal(result.popup, null);
  assert.ok(result.seen.has("github/before"));
});

test("a plugin with pop-ups off stays quiet, and switching them on later does not bring the past back", () => {
  const off = new Set(["github"]);
  const quiet = nextPluginPopup(none, [note("a", 2000)], off, 1000);
  assert.equal(quiet.popup, null);
  assert.equal(nextPluginPopup(quiet.seen, [note("a", 2000)], none, 1000).popup, null);
  assert.equal(nextPluginPopup(quiet.seen, [note("b", 3000)], none, 1000).popup?.id, "b");
});

test("another plugin's pop-ups are not affected by one plugin being off", () => {
  const result = nextPluginPopup(none, [note("a", 2000, "github"), note("b", 1500, "other")], new Set(["github"]), 1000);
  assert.equal(result.popup?.id, "b");
});

test("a plugin pop-up opens the Notifications page and ranks like a notification from an app", () => {
  assert.equal(previewPage("plugin"), "qq");
  assert.equal(previewPriority("plugin"), previewPriority(undefined));
});
