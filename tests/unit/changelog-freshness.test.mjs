import test from "node:test";
import assert from "node:assert/strict";
import { RELEASE_NOTES_FRESH_MS, releaseNotesAreFresh } from "../../src/features/changelog/freshness.ts";

const release = { tag: "v1.0.0", name: "v1.0.0", body: "", publishedAt: "", url: "", prerelease: false };
const now = 1_000_000_000_000;

test("a recent saved list is fresh, an old one is not", () => {
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: now - 1000 }, now), true);
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: now - RELEASE_NOTES_FRESH_MS + 1 }, now), true);
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: now - RELEASE_NOTES_FRESH_MS }, now), false);
});

test("missing, empty or undated lists are never fresh", () => {
  assert.equal(releaseNotesAreFresh(null, now), false);
  assert.equal(releaseNotesAreFresh({ releases: [], fetchedAt: now }, now), false);
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: 0 }, now), false);
});

test("a saved time well ahead of the clock is not trusted", () => {
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: now + 30_000 }, now), true);
  assert.equal(releaseNotesAreFresh({ releases: [release], fetchedAt: now + 3_600_000 }, now), false);
});
