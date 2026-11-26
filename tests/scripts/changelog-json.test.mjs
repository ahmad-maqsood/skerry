import assert from "node:assert/strict";
import test from "node:test";
import { CHANGELOG_LIMIT, changelogEntries } from "../../scripts/release/changelog-json.mjs";

const release = (tag_name, extra = {}) => ({ tag_name, name: tag_name, body: "notes", published_at: "2026-11-25T00:00:00Z", html_url: "u", prerelease: false, draft: false, ...extra });

test("the new release leads, without drafts, repeats or other API fields", () => {
  const list = changelogEntries(release("v2.0.0"), [release("v1.9.0", { assets: [1], id: 7 }), release("v1.8.0", { draft: true }), release("v2.0.0", { body: "old" })]);
  assert.deepEqual(list.map((entry) => entry.tag_name), ["v2.0.0", "v1.9.0"]);
  assert.equal(list[0].body, "notes");
  assert.deepEqual(Object.keys(list[1]).sort(), ["body", "draft", "html_url", "name", "prerelease", "published_at", "tag_name"]);
});

test("the history is capped", () => {
  const many = Array.from({ length: 50 }, (_, index) => release(`v1.${index}.0`));
  assert.equal(changelogEntries(release("v2.0.0"), many).length, CHANGELOG_LIMIT);
});
