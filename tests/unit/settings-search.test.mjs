import test from "node:test";
import assert from "node:assert/strict";
import { SEARCH_RESULT_LIMIT, searchSettings } from "../../src/windows/settings/searchSettings.ts";
import { SETTINGS_SEARCH_INDEX } from "../../src/windows/settings/searchIndex.ts";
import { SETTINGS_CATEGORIES } from "../../src/windows/settings/categories.ts";

const pages = [
  { page: "general", label: "General" },
  { page: "appearance", label: "Appearance" },
  { page: "music", label: "Music" },
];
const index = [
  { page: "appearance", group: "Pixel cat" },
  { page: "appearance", group: "Pixel cat", title: "Show a pixel cat on the island" },
  { page: "appearance", group: "Pixel cat", title: "Show the pixel cat when a song is playing", conditional: true },
  { page: "general", group: "Island tabs", title: "Music" },
  { page: "music", title: "Enable music controls" },
];
const labels = (query, list = index) => searchSettings(list, pages, query).map((result) => result.label);

test("an empty or blank search finds nothing", () => {
  assert.deepEqual(labels(""), []);
  assert.deepEqual(labels("   "), []);
});

test("every word typed must be in the name, in any order and case", () => {
  assert.deepEqual(labels("CAT pixel"), ["Pixel cat", "Show a pixel cat on the island", "Show the pixel cat when a song is playing"]);
  assert.deepEqual(labels("song cat"), ["Show the pixel cat when a song is playing"]);
  assert.deepEqual(labels("nothing like this"), []);
});

test("names starting with the first word come first, then those that hold all the words", () => {
  assert.deepEqual(labels("show"), ["Show a pixel cat on the island", "Show the pixel cat when a song is playing"]);
  assert.deepEqual(labels("pixel").slice(0, 3), ["Pixel cat", "Show a pixel cat on the island", "Show the pixel cat when a song is playing"]);
});

test("a page's name finds the page before the settings that share the word", () => {
  const found = searchSettings(index, pages, "music");
  assert.equal(found[0].label, "Music");
  assert.deepEqual(found[0].target, { page: "music" });
  assert.equal(found[0].where, "");
  assert.deepEqual(found.map((result) => result.label), ["Music", "Music", "Enable music controls"]);
});

test("a setting also matches through its group and page, and says where it is", () => {
  const [byGroup] = searchSettings(index, pages, "island tabs music");
  assert.equal(byGroup.label, "Music");
  assert.equal(byGroup.where, "General › Island tabs");
  assert.deepEqual(byGroup.target, { page: "general", group: "Island tabs", title: "Music" });
  const [group] = searchSettings(index, pages, "pixel cat");
  assert.deepEqual(group.target, { page: "appearance", group: "Pixel cat", title: undefined });
  assert.equal(group.where, "Appearance");
  const [top] = searchSettings(index, pages, "enable music");
  assert.equal(top.where, "Music");
});

test("the list is capped and entries of an unknown page are skipped", () => {
  const many = Array.from({ length: 30 }, (_, number) => ({ page: "general", title: `Switch ${number}` }));
  assert.equal(searchSettings(many, pages, "switch").length, SEARCH_RESULT_LIMIT);
  assert.equal(searchSettings(many, pages, "switch", 3).length, 3);
  assert.deepEqual(labels("ghost", [{ page: "plugins", title: "Ghost" }]), []);
});

test("the search index only names pages that exist and lists no entry twice", () => {
  const seen = new Set();
  for (const entry of SETTINGS_SEARCH_INDEX) {
    assert.ok(SETTINGS_CATEGORIES.includes(entry.page), `unknown page ${entry.page}`);
    assert.ok(entry.group || entry.title, "an entry names a group or a setting");
    const key = `${entry.page}|${entry.group ?? ""}|${entry.title ?? ""}`;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  }
  assert.ok(SETTINGS_SEARCH_INDEX.some((entry) => entry.title === "Show a pixel cat on the island"));
});
