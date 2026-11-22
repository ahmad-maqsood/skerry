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
