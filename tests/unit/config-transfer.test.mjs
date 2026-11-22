import assert from "node:assert/strict";
import { test } from "node:test";
import { filterStorage, isTransferableKey, parseBackup, validateBackup } from "../../src/features/config-transfer/format.ts";
import { applyConfigStorage, collectConfigStorage } from "../../src/features/config-transfer/storage.ts";

const backup = () => ({ app: "skerry", formatVersion: 1, exportedAt: "2026-11-19T00:00:00Z", appVersion: "0.1.0", localStorage: {}, files: {} });

test("prefix discovery includes future features and language, excludes foreign/device/runtime keys", () => {
  const entries = Object.fromEntries(["skerry-future", "skerry-locale", "skerry-position",
    "skerry-panel-preview", "skerry-settings-focus", "skerry-position-reset", "other", "skerry"].map(key => [key, "raw"]));
  assert.deepEqual(filterStorage(entries, false), { "skerry-future": "raw", "skerry-locale": "raw" });
  assert.equal(isTransferableKey("skerry-clipboard-window-pinned", false), true);
  assert.equal(isTransferableKey("skerry-clipboard-history", false), false);
  assert.equal(isTransferableKey("skerry-clipboard-history", true), true);
});

test("format errors distinguish legacy theme files, other apps, versions and corrupt structures", () => {
  assert.deepEqual(parseBackup(JSON.stringify(backup())), backup());
  for (const [value, code] of [[{ ...backup(), app: "other" }, "wrongApp"],
    [{ ...backup(), formatVersion: 2 }, "unsupportedVersion"], [{ app: "skerry", version: 1, kind: "theme" }, "unsupportedVersion"],
    [{ ...backup(), localStorage: [] }, "invalidStructure"], [{ ...backup(), localStorage: { key: {} } }, "invalidStructure"],
    [{ ...backup(), files: null }, "invalidStructure"], [{ ...backup(), exportedAt: "bad" }, "invalidStructure"], [null, "invalidStructure"]]) {
    assert.throws(() => validateBackup(value), error => error.code === code);
  }
  assert.throws(() => parseBackup("{bad"), error => error.code === "invalidJson");
});

function mockStorage(initial, failOnce) {
  const data = new Map(Object.entries(initial));
  const localStorage = {
    get length() { return data.size; }, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key),
    setItem(key, value) {
      if (failOnce === key) { failOnce = undefined; throw new Error("QuotaExceededError"); }
      data.set(key, value);
    },
  };
  globalThis.window = { localStorage };
  return data;
}

test("restore replaces raw values, clears missing app keys and preserves this device", () => {
  const data = mockStorage({ "skerry-old": "old", "skerry-position": "here", foreign: "keep" });
  applyConfigStorage({ "skerry-new": "{raw}", "skerry-position": "there", foreign: "bad" });
  assert.deepEqual(Object.fromEntries(data), { "skerry-position": "here", foreign: "keep", "skerry-new": "{raw}" });
  assert.deepEqual(collectConfigStorage(false), { "skerry-new": "{raw}" });
});

test("failed writes roll the app keys back", () => {
  const initial = { "skerry-old": "original", "skerry-position": "here" };
  const data = mockStorage(initial, "skerry-new");
  assert.throws(() => applyConfigStorage({ "skerry-new": "next" }), /storageUnavailable/);
  assert.deepEqual(Object.fromEntries(data), initial);
});
