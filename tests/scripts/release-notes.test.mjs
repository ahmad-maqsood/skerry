import assert from "node:assert/strict";
import test from "node:test";
import {
  changesMarkdown, classify, compareVersions, descriptionMarkdown, downloadsTable, parseVersion, previousTag,
} from "../../scripts/release/release-notes.mjs";

test("versions are read with or without the v, and anything else is refused", () => {
  assert.deepEqual(parseVersion("v1.2.3"), [1, 2, 3, ""]);
  assert.deepEqual(parseVersion("0.1.0-beta.1"), [0, 1, 0, "beta.1"]);
  for (const text of ["", "v1.2", "latest", "v1.2.3.4"]) assert.equal(parseVersion(text), null, text);
});

test("versions compare by number, and a release is newer than its pre-releases", () => {
  assert.ok(compareVersions("v0.10.0", "v0.9.0") > 0);
  assert.ok(compareVersions("v1.0.0", "v1.0.0-rc.1") > 0);
  assert.ok(compareVersions("v1.0.0-beta.1", "v1.0.0-beta.2") < 0);
  assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
});

test("the previous release is the newest tag below it; stable skips pre-releases", () => {
  const tags = ["v0.1.0", "v0.2.0-beta.1", "v0.2.0", "v0.3.0-beta.1", "v0.3.0", "nightly"];
  assert.equal(previousTag("v0.3.0", tags), "v0.2.0");
  assert.equal(previousTag("v0.3.0-beta.1", tags), "v0.2.0");
  assert.equal(previousTag("v0.2.0", tags), "v0.1.0");
  assert.equal(previousTag("v0.2.0-beta.2", tags), "v0.2.0-beta.1");
  assert.equal(previousTag("v0.1.0", tags), null);
  assert.equal(previousTag("v0.4.0", ["v0.3.0-beta.1"]), null);
});

test("commit subjects are sorted into groups, and noise is dropped", () => {
  assert.deepEqual(classify("Add Island tabs switches to settings"), { group: "Added", text: "Add Island tabs switches to settings" });
  assert.deepEqual(classify("Show an island notification when the charger is plugged"), { group: "Added", text: "Show an island notification when the charger is plugged" });
  assert.equal(classify("Fix island notes not auto-saving").group, "Fixed");
  assert.deepEqual(classify("fix(island): keep the cover"), { group: "Fixed", text: "keep the cover" });
  assert.deepEqual(classify("feat: add a thing"), { group: "Added", text: "add a thing" });
  assert.equal(classify("Make the island's scrollbars narrower").group, "Changed");
  assert.deepEqual(classify("docs: clarify licensing"), { group: "Maintenance", text: "clarify licensing" });
  assert.equal(classify("chore: declare GPL-3.0-only Cargo license").group, "Maintenance");
  for (const text of ["Run CI on pull requests", "Document the translation output language picker", "Speed up CI and release workflows", "Include GPL license text in Windows installers"]) {
    assert.equal(classify(text).group, "Maintenance", text);
  }
  for (const noise of ["Initial Push", "Merge main into improve/x", "Merge pull request #3 from a/b", "Bump version to 0.2.0", "Release v0.2.0", "docs: refresh screenshots [skip ci]", ""]) {
    assert.equal(classify(noise), null, noise);
  }
});

test("the changes are grouped in a fixed order with commit links, and repeats appear once", () => {
  const text = changesMarkdown([
    "aaa1111\tFix the cover showing twice",
    "bbb2222\tAdd a minimize button",
    "ccc3333\tAdd a minimize button",
    "ddd4444\tMerge main into x",
    "eee5555\tdocs: update guide",
    "fff6666\tMake scrollbars narrower",
  ], "o/r");
  const order = ["### Added", "### Fixed", "### Changed", "### Maintenance"].map((heading) => text.indexOf(heading));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(order.every((position) => position >= 0));
  assert.equal(text.match(/minimize button/gi).length, 1);
  assert.ok(text.includes("- Fix the cover showing twice ([`aaa1111`](https://github.com/o/r/commit/aaa1111))"));
  assert.ok(!text.includes("Merge"));
});

test("a release with nothing worth listing still gets a sentence", () => {
  assert.match(changesMarkdown(["a\tMerge main into x"]), /internal improvements/);
  assert.match(changesMarkdown([]), /internal improvements/);
});

test("the downloads table lists each installer with what it is and its hash", () => {
  const table = downloadsTable([{ name: "Skerry_0.2.0_x64-setup.exe", sha256: "ab12" }, { name: "Skerry_0.2.0_x64_en-US.msi", sha256: "cd34" }]);
  assert.match(table, /\| `Skerry_0.2.0_x64-setup.exe` \| Windows installer \(64-bit\)\. Recommended.*\| `ab12` \|/);
  assert.match(table, /\| `Skerry_0.2.0_x64_en-US.msi` \| Windows MSI installer.*\| `cd34` \|/);
});

test("the description has what's new, downloads, how to verify and the changelog link", () => {
  const text = descriptionMarkdown({
    repo: "o/r", tag: "v0.2.0", changes: "### Added\n\n- Thing", previous: "v0.1.0",
    assets: [{ name: "Skerry_0.2.0_x64-setup.exe", sha256: "ab12" }],
  });
  for (const part of ["## What's new", "- Thing", "## Downloads", "Get-FileHash .\\Skerry_0.2.0_x64-setup.exe", "Settings → About",
    "[v0.1.0...v0.2.0](https://github.com/o/r/compare/v0.1.0...v0.2.0)"]) assert.ok(text.includes(part), part);
  assert.ok(!text.includes("Pre-release"));
});

test("a pre-release says so, and the first release links its history instead of a comparison", () => {
  const text = descriptionMarkdown({ repo: "o/r", tag: "v0.1.0-beta.1", changes: "x", previous: null });
  assert.ok(text.startsWith("> **Pre-release.**"));
  assert.ok(text.includes("https://github.com/o/r/commits/v0.1.0-beta.1"));
  assert.ok(!text.includes("## Downloads"));
});
