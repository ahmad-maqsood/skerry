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
  assert.throws(() => resolveRequestedVersion("banana", "1.1.0"), /not a version/);
  assert.equal(isValidVersion("1.2"), false);
});
