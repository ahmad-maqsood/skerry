import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

// The native WebView hands the page a read-only __TAURI_INTERNALS__ (invoke, metadata, ...).
function fakeWindow({ readOnly }) {
  const internals = {};
  for (const key of ["invoke", "transformCallback", "metadata"]) {
    Object.defineProperty(internals, key, { value: () => "tauri", enumerable: true });
  }
  if (readOnly) Object.freeze(internals);
  return { crypto: webcrypto, __TAURI_INTERNALS__: internals };
}

async function load(window) {
  globalThis.window = window;
  return import(`../screenshots/tauriMocks.ts?${Math.random()}`);
}

for (const readOnly of [true, false]) {
  test(`mockIPC answers invoke when Tauri's internals are ${readOnly ? "read-only" : "writable"}`, async () => {
    const window = fakeWindow({ readOnly });
    const { mockIPC, mockWindows } = await load(window);
    mockIPC((command, payload) => ({ command, payload }));
    mockWindows("main");
    assert.deepEqual(await window.__TAURI_INTERNALS__.invoke("ping", { a: 1 }), { command: "ping", payload: { a: 1 } });
    assert.equal(window.__TAURI_INTERNALS__.metadata.currentWindow.label, "main");
    const id = window.__TAURI_INTERNALS__.transformCallback(() => {});
    assert.equal(typeof id, "number");
    window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener("e", id);
    assert.equal(window.__TAURI_INTERNALS__.callbacks.has(id), false);
  });
}

test("mockIPC can run twice, and mock events reach their listeners", async () => {
  const window = fakeWindow({ readOnly: true });
  const { mockIPC } = await load(window);
  mockIPC(() => null);
  mockIPC(() => "second", { shouldMockEvents: true });
  assert.equal(await window.__TAURI_INTERNALS__.invoke("anything"), "second");
  const seen = [];
  const handler = window.__TAURI_INTERNALS__.transformCallback((event) => seen.push(event.payload));
  await window.__TAURI_INTERNALS__.invoke("plugin:event|listen", { event: "x", handler });
  await window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "x", payload: 7 });
  assert.deepEqual(seen, [7]);
});

test("a window property that cannot be replaced gives a clear error", async () => {
  const window = { crypto: webcrypto };
  Object.defineProperty(window, "__TAURI_INTERNALS__", { value: Object.freeze({ invoke() {} }) });
  const { mockIPC } = await load(window);
  assert.throws(() => mockIPC(() => null), /Cannot replace window\.__TAURI_INTERNALS__/);
});
