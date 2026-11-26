import assert from "node:assert/strict";
import test from "node:test";
import { catalogSource, normalizeCatalog } from "../../src/features/plugins/catalogCache.ts";

test("the saved index path is its own source only in developer mode", () => {
  assert.equal(catalogSource(false, "D:\\index.json"), "");
  assert.equal(catalogSource(true, ""), "");
  assert.equal(catalogSource(true, "D:\\index.json"), "D:\\index.json");
});

test("a stored plugin list is used only when the page can draw it", () => {
  const entry = { id: "github", version: "0.1.0", name: { en: "GitHub" }, description: { en: "Runs" } };
  const stored = { source: "", unavailable: false, entries: [entry] };
  assert.deepEqual(normalizeCatalog(stored), stored);
  for (const broken of [undefined, null, 3, {}, { ...stored, entries: "x" }, { ...stored, entries: [null] },
    { ...stored, entries: [{ ...entry, name: undefined }] }]) assert.equal(normalizeCatalog(broken), null);
});
