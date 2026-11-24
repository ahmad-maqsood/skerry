import assert from "node:assert/strict";
import test from "node:test";
import { calculateNextVersion } from "../../scripts/release/bump-version.mjs";

test("calculateNextVersion calculates standard semver increments", () => {
  assert.equal(calculateNextVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(calculateNextVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(calculateNextVersion("1.2.3", "major"), "2.0.0");
});

test("calculateNextVersion handles prereleases", () => {
  assert.equal(calculateNextVersion("1.2.3", "patch", true), "1.2.4-beta.1");
  assert.equal(calculateNextVersion("1.2.3", "minor", true), "1.3.0-beta.1");
  assert.equal(calculateNextVersion("1.2.3", "major", true), "2.0.0-beta.1");
  assert.equal(calculateNextVersion("1.2.4-beta.1", "patch", true), "1.2.4-beta.2");
  assert.equal(calculateNextVersion("1.2.4-beta.2", "patch", false), "1.2.4");
});

test("resolveRequestedVersion accepts exact versions and bump words", async () => {
  const { resolveRequestedVersion, isValidVersion } = await import("../../scripts/release/bump-version.mjs");
  assert.equal(resolveRequestedVersion("1.4.0", "1.1.0"), "1.4.0");
  assert.equal(resolveRequestedVersion(" v2.0.0-beta.1 ", "1.1.0"), "2.0.0-beta.1");
  assert.equal(resolveRequestedVersion("minor", "1.1.0"), "1.2.0");
  assert.throws(() => resolveRequestedVersion("1.1.0", "1.1.0"), /already/);
  assert.equal(resolveRequestedVersion("1.1.0", "1.1.0", { allowCurrent: true }), "1.1.0");
  assert.throws(() => resolveRequestedVersion("banana", "1.1.0"), /not a version/);
  assert.equal(isValidVersion("1.2"), false);
});

test("bump-version.mjs rejects an unknown argument instead of bumping the patch", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync, readFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "bump-"));
  writeFileSync(join(dir, "package.json"), '{"version":"1.1.0"}\n');
  const script = resolve("scripts/release/bump-version.mjs");
  const result = spawnSync(process.execPath, [script, "banana"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a version/);
  assert.equal(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).version, "1.1.0");
});
