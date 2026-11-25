import assert from "node:assert/strict";
import test from "node:test";
import { addDismissed, buildFeed, dismissKey, MAX_DISMISSED, normalizeDismissed, openUrlFromResult } from "../../src/features/plugins/pluginFeed.ts";

const manifest = (name) => ({ name: { en: name, "zh-CN": name } });
const note = (id, receivedAt) => ({ id, sourceId: "github", appName: "GitHub", icon: "github", title: id, body: "", receivedAt, action: null });
const session = (id, updatedAt) => ({ id, title: id, cwd: "o/r", status: "running", updatedAt, action: null });

function snapshot(plugins) {
  const installed = {};
  const live = {};
  for (const [id, { enabled = true, name = id, notifications = [], sessions = [] }] of Object.entries(plugins)) {
    installed[id] = { manifest: manifest(name), enabled };
    live[id] = { status: "running", quota: [], sessions, notifications };
  }
  return { registry: { developerMode: false, indexUrl: "", installed }, live };
}

test("notifications are newest first and tagged with their plugin", () => {
  const feed = buildFeed(snapshot({ github: { notifications: [note("a", 1), note("b", 3)] }, other: { notifications: [note("c", 2)] } }), new Set());
  assert.deepEqual(feed.notifications.map((item) => `${item.pluginId}/${item.id}`), ["github/b", "other/c", "github/a"]);
});

test("sessions are most recently updated first and carry the plugin's name", () => {
  const feed = buildFeed(snapshot({ github: { name: "GitHub", sessions: [session("old", 1), session("new", 9)] } }), new Set());
  assert.deepEqual(feed.sessions.map((item) => item.id), ["new", "old"]);
  assert.equal(feed.sessions[0].pluginName, "GitHub");
});

test("dismissed notifications and disabled or unknown plugins are left out", () => {
  const plugins = { github: { notifications: [note("a", 1), note("b", 2)], sessions: [session("s", 1)] }, off: { enabled: false, notifications: [note("x", 1)], sessions: [session("y", 1)] } };
  const feed = buildFeed(snapshot(plugins), new Set(["github/a"]));
  assert.deepEqual(feed.notifications.map((item) => item.id), ["b"]);
  assert.deepEqual(feed.sessions.map((item) => item.id), ["s"]);
  const withGhost = snapshot({});
  withGhost.live.ghost = { status: "running", quota: [], sessions: [session("g", 1)], notifications: [note("g", 1)] };
  assert.deepEqual(buildFeed(withGhost, new Set()), { notifications: [], sessions: [] });
});

test("the same id from two plugins is two notifications", () => {
  const feed = buildFeed(snapshot({ one: { notifications: [note("a", 1)] }, two: { notifications: [note("a", 2)] } }), new Set([dismissKey({ pluginId: "one", id: "a" })]));
  assert.deepEqual(feed.notifications.map((item) => item.pluginId), ["two"]);
});

test("a plugin that published no lists is handled", () => {
  const data = snapshot({ github: {} });
  data.live.github = { status: "running" };
  assert.deepEqual(buildFeed(data, new Set()), { notifications: [], sessions: [] });
});

test("saved dismissed keys are cleaned and bounded", () => {
  assert.deepEqual(normalizeDismissed(undefined), []);
  assert.deepEqual(normalizeDismissed({ a: 1 }), []);
  assert.deepEqual(normalizeDismissed(["a", "a", 3, "", null, "b", "x".repeat(600)]), ["a", "b"]);
  const many = Array.from({ length: MAX_DISMISSED + 20 }, (_, index) => `k${index}`);
  const kept = normalizeDismissed(many);
  assert.equal(kept.length, MAX_DISMISSED);
  assert.equal(kept.at(-1), `k${MAX_DISMISSED + 19}`);
});

test("adding dismissed keys keeps the newest and does not repeat", () => {
  assert.deepEqual(addDismissed(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
  assert.deepEqual(addDismissed([], []), []);
  const full = Array.from({ length: MAX_DISMISSED }, (_, index) => `k${index}`);
  const next = addDismissed(full, ["new"]);
  assert.equal(next.length, MAX_DISMISSED);
  assert.equal(next[0], "k1");
  assert.equal(next.at(-1), "new");
});

test("only https addresses without a login are opened", () => {
  assert.equal(openUrlFromResult({ openUrl: "https://github.com/o/r/pull/1" }), "https://github.com/o/r/pull/1");
  for (const bad of [null, undefined, "https://github.com", {}, { openUrl: 5 }, { openUrl: "http://github.com/x" }, { openUrl: "javascript:alert(1)" },
                     { openUrl: "file:///C:/x" }, { openUrl: "https://user:pw@github.com/x" }, { openUrl: "not a url" }, { openUrl: `https://a.com/${"x".repeat(3000)}` }]) {
    assert.equal(openUrlFromResult(bad), null, JSON.stringify(bad)?.slice(0, 60));
  }
});
