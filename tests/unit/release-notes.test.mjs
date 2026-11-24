import assert from "node:assert/strict";
import test from "node:test";
import { isInstalledTag, parseInline, parseNoteBlocks, releaseHighlights } from "../../src/features/changelog/releaseText.ts";
import { normalizeReleaseNotesCache } from "../../src/features/changelog/storage.ts";

const generated = [
  "## What's new",
  "",
  "### Added",
  "",
  "- Show a changelog ([`abc1234`](https://github.com/x/y/commit/abc1234))",
  "",
  "## Downloads",
  "",
  "| File | What it is | SHA-256 |",
  "| --- | --- | --- |",
  "",
  "**Full changelog**: [v1.0.0...v1.1.0](https://github.com/x/y/compare/v1.0.0...v1.1.0)",
].join("\n");

test("a generated description keeps only what is new", () => {
  assert.equal(releaseHighlights(generated), "### Added\n\n- Show a changelog ([`abc1234`](https://github.com/x/y/commit/abc1234))");
  assert.equal(releaseHighlights("## What\u2019s new\r\n\r\n- One\r\n## Downloads\r\nx"), "- One");
});

test("a description without that heading is kept whole, minus Downloads", () => {
  assert.equal(releaseHighlights("Plain notes.\n\n- A\n- B"), "Plain notes.\n\n- A\n- B");
  assert.equal(releaseHighlights("Notes\n\n## Downloads\n\ntable"), "Notes");
  assert.equal(releaseHighlights(""), "");
});

test("bold, code and web links are read; other links stay plain text", () => {
  assert.deepEqual(parseInline("a **b** `c` [d](https://example.com/x)"), [
    { kind: "text", text: "a " },
    { kind: "bold", text: "b" },
    { kind: "text", text: " " },
    { kind: "code", text: "c" },
    { kind: "text", text: " " },
    { kind: "link", text: "d", href: "https://example.com/x" },
  ]);
  assert.deepEqual(parseInline("[`abc`](https://e.com/c)"), [{ kind: "link", text: "abc", href: "https://e.com/c" }]);
  assert.deepEqual(parseInline("[x](javascript:alert)"), [{ kind: "text", text: "x" }]);
  assert.deepEqual(parseInline("[x](file:///C:/a)"), [{ kind: "text", text: "x" }]);
  assert.deepEqual(parseInline("no markup"), [{ kind: "text", text: "no markup" }]);
});

test("headings, paragraphs, lists and fenced code become blocks", () => {
  const blocks = parseNoteBlocks("### Fixed\n\nA line\nthat wraps.\n\n- One\n- Two\n1. Three\n\n```powershell\nGet-FileHash x\n```\n");
  assert.deepEqual(blocks.map((block) => block.kind), ["heading", "paragraph", "list", "code"]);
  assert.equal(blocks[1].parts[0].text, "A line that wraps.");
  assert.equal(blocks[2].items.length, 3);
  assert.equal(blocks[3].text, "Get-FileHash x");
  assert.deepEqual(parseNoteBlocks(""), []);
});

test("a paragraph and a list that follow each other stay separate blocks", () => {
  assert.deepEqual(parseNoteBlocks("Intro\n- A\nOutro").map((block) => block.kind), ["paragraph", "list", "paragraph"]);
});

test("the installed version matches its tag with or without the v", () => {
  assert.equal(isInstalledTag("v1.1.0", "1.1.0"), true);
  assert.equal(isInstalledTag("1.1.0", "v1.1.0"), true);
  assert.equal(isInstalledTag("v1.1.0", "1.1.1"), false);
  assert.equal(isInstalledTag("v1.1.0", ""), false);
});

test("a saved list is read defensively", () => {
  assert.equal(normalizeReleaseNotesCache(null), null);
  assert.equal(normalizeReleaseNotesCache({ releases: "x" }), null);
  const cache = normalizeReleaseNotesCache({
    fetchedAt: 5,
    releases: [{ tag: "v1.0.0", body: "b", prerelease: true }, { tag: "" }, 7, null, { tag: "v0.9.0", name: "Nine", publishedAt: "2026-01-01T00:00:00Z", url: "u" }],
  });
  assert.equal(cache.fetchedAt, 5);
  assert.deepEqual(cache.releases.map((release) => [release.tag, release.name, release.prerelease]), [["v1.0.0", "v1.0.0", true], ["v0.9.0", "Nine", false]]);
  assert.equal(normalizeReleaseNotesCache({ releases: [], fetchedAt: "no" }).fetchedAt, 0);
});
