import assert from "node:assert/strict";
import test from "node:test";
import { activePluginFilter, filterFeed, offersPluginFilter, pluginsInFeed } from "../../src/features/plugins/pluginFilter.ts";

const note = (pluginId, id, appName = pluginId) => ({ pluginId, id, sourceId: pluginId, appName, icon: "x", title: id, body: "", receivedAt: 1, action: null });
const task = (pluginId, id, pluginName = pluginId) => ({ pluginId, pluginName, id, title: id, cwd: null, status: "running", updatedAt: 1, action: null });
const feed = { notifications: [note("b", "n1", "Beta")], sessions: [task("a", "s1", "Alpha"), task("b", "s2", "Beta")] };

test("the filter lists plugins that have something to show, by name", () => {
  assert.deepEqual(pluginsInFeed(feed), [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }]);
  assert.deepEqual(pluginsInFeed({ notifications: [], sessions: [] }), []);
});

test("the filter is offered only for two or more plugins", () => {
  assert.equal(offersPluginFilter([{ id: "a", name: "A" }]), false);
  assert.equal(offersPluginFilter(pluginsInFeed(feed)), true);
});

test("a saved choice that cannot be picked any more means all plugins", () => {
  const plugins = pluginsInFeed(feed);
  assert.equal(activePluginFilter("a", plugins), "a");
  assert.equal(activePluginFilter("gone", plugins), null);
  assert.equal(activePluginFilter(null, plugins), null);
});

test("filtering keeps one plugin's notifications and tasks", () => {
  assert.equal(filterFeed(feed, null), feed);
  const only = filterFeed(feed, "b");
  assert.deepEqual(only.notifications.map((item) => item.id), ["n1"]);
  assert.deepEqual(only.sessions.map((item) => item.id), ["s2"]);
  assert.deepEqual(filterFeed(feed, "a").notifications, []);
});
