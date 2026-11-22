import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PAGES, pageOutcome, passedChecks, selectShard } from "../../scripts/run-regression.mjs";

test("each way a regression page reports its result is understood", () => {
  assert.equal(pageOutcome({ testResult: "passed" }), "passed");
  assert.equal(pageOutcome({ testResult: "failed" }), "failed");
  assert.equal(pageOutcome({ dataResult: "passed" }), "passed");
  assert.equal(pageOutcome({ text: "ALL PASS\nPASS a" }), "passed");
  assert.equal(pageOutcome({ text: "SOME FAILED\nFAIL a" }), "failed");
  assert.equal(pageOutcome({ text: "PASS a\nPASS b\n\nAll 2 checks passed." }), "passed");
  assert.equal(pageOutcome({ text: "PASS a\nFAIL Error: b" }), "failed");
});

test("a page that is still running has no outcome yet", () => {
  assert.equal(pageOutcome({}), null);
  assert.equal(pageOutcome({ text: "Preparing message animation checks…" }), null);
  assert.equal(pageOutcome({ text: "PASS a\nPASS b" }), null);
});

test("passed checks are counted from PASS lines only", () => {
  assert.equal(passedChecks("PASS a\nPASS b\nFAIL c\n  PASS not at line start"), 2);
  assert.equal(passedChecks(""), 0);
});

test("every listed regression page exists", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  for (const page of PAGES) assert.ok(existsSync(path.join(root, "tests/regression", page.split("?")[0])), page);
});

test("shards together cover every page exactly once", () => {
  const shards = [1, 2, 3].map((index) => selectShard(PAGES, `${index}/3`));
  assert.deepEqual(shards.flat().sort(), [...PAGES].sort());
  assert.ok(Math.max(...shards.map((shard) => shard.length)) - Math.min(...shards.map((shard) => shard.length)) <= 1);
  assert.deepEqual(selectShard(PAGES, "1/1"), PAGES);
});

test("a malformed shard is refused", () => {
  for (const spec of ["", "3", "0/3", "4/3", "a/b", "1/0"]) assert.throws(() => selectShard(PAGES, spec), /--shard/, spec);
});

test("each run gets free ports of its own", async () => {
  const { freePort } = await import("../../scripts/run-regression.mjs");
  const [a, b] = await Promise.all([freePort(), freePort()]);
  assert.ok(Number.isInteger(a) && a > 0 && Number.isInteger(b) && b > 0);
});
