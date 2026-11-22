import assert from "node:assert/strict";
import test from "node:test";
import { readJson, readString, removeItem, writeJson, writeString } from "../../src/lib/storage.ts";

function withWindow(windowValue, run) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: windowValue });
  try {
    run();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else delete globalThis.window;
  }
}

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test("strings round-trip and missing keys read as null", () => {
  const storage = memoryStorage();
  withWindow({ localStorage: storage }, () => {
    assert.equal(readString("skerry-test"), null);
    assert.equal(writeString("skerry-test", "value"), true);
    assert.equal(readString("skerry-test"), "value");
    assert.equal(removeItem("skerry-test"), true);
    assert.equal(readString("skerry-test"), null);
  });
});

test("JSON is stored in the same format as JSON.stringify and parsed as unknown", () => {
  const storage = memoryStorage();
  withWindow({ localStorage: storage }, () => {
    const value = { enabled: true, items: [1, "two", null] };
    assert.equal(writeJson("skerry-test", value), true);
    assert.equal(storage.values.get("skerry-test"), JSON.stringify(value));
    assert.deepEqual(readJson("skerry-test"), value);
    assert.equal(readJson("skerry-missing"), undefined);
  });
});

test("corrupted JSON reads as undefined instead of throwing", () => {
  const storage = memoryStorage([["skerry-test", "{not json"]]);
  withWindow({ localStorage: storage }, () => {
    assert.equal(readJson("skerry-test"), undefined);
  });
});

test("values that cannot be serialized are rejected without writing", () => {
  const storage = memoryStorage();
  const cyclic = {};
  cyclic.self = cyclic;
  withWindow({ localStorage: storage }, () => {
    assert.equal(writeJson("skerry-test", cyclic), false);
    assert.equal(writeJson("skerry-test", undefined), false);
    assert.equal(storage.values.has("skerry-test"), false);
  });
});

test("blocked or full storage never throws", () => {
  const throwing = () => { throw new Error("QuotaExceededError"); };
  withWindow({ localStorage: { getItem: throwing, setItem: throwing, removeItem: throwing } }, () => {
    assert.equal(readString("k"), null);
    assert.equal(readJson("k"), undefined);
    assert.equal(writeString("k", "v"), false);
    assert.equal(writeJson("k", { a: 1 }), false);
    assert.equal(removeItem("k"), false);
  });
  const blockedWindow = {};
  Object.defineProperty(blockedWindow, "localStorage", { get: throwing });
  withWindow(blockedWindow, () => {
    assert.equal(readString("k"), null);
    assert.equal(writeString("k", "v"), false);
    assert.equal(removeItem("k"), false);
  });
});
