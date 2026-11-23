import assert from "node:assert/strict";
import test from "node:test";
import { findNoteImagePaths, insertAtSelection, noteImageMarkdown, pastedImage } from "../../src/features/todos/noteImages.ts";

const item = (kind, type, file = {}) => ({ kind, type, getAsFile: () => file });
const paste = (text, items) => ({ getData: (format) => (format === "text/plain" ? text : ""), items });

test("a paste of an image alone gives the image", () => {
  const file = { name: "shot.png" };
  assert.equal(pastedImage(paste("", [item("file", "image/png", file)])), file);
});

test("a paste that carries text stays a text paste", () => {
  assert.equal(pastedImage(paste("some words", [item("file", "image/png")])), null);
});

test("files that are not images, strings and empty pastes give nothing", () => {
  assert.equal(pastedImage(paste("", [item("file", "application/pdf")])), null);
  assert.equal(pastedImage(paste("", [item("string", "text/html")])), null);
  assert.equal(pastedImage(paste("", [])), null);
  assert.equal(pastedImage(null), null);
});

test("an image is referred to as markdown", () => {
  assert.equal(noteImageMarkdown("assets/2026-11-23-1.png"), "![image](assets/2026-11-23-1.png)");
});

test("the images a note refers to are found once each, in order", () => {
  const note = "a\n![image](assets/b.png)\ntext ![x](assets/a.jpg) and ![image](assets/b.png)\n![web](https://example.com/c.png)\n![up](../assets/d.png)";
  assert.deepEqual(findNoteImagePaths(note), ["assets/b.png", "assets/a.jpg"]);
  assert.deepEqual(findNoteImagePaths(""), []);
});

test("an image lands on a line of its own with the caret below it", () => {
  const image = "![image](assets/a.png)";
  assert.deepEqual(insertAtSelection("", 0, 0, image), { value: `${image}\n`, caret: image.length + 1 });
  assert.deepEqual(insertAtSelection("hello", 5, 5, image), { value: `hello\n${image}\n`, caret: 5 + 1 + image.length + 1 });
  assert.deepEqual(insertAtSelection("ab\ncd", 3, 3, image), { value: `ab\n${image}\ncd`, caret: 3 + image.length + 1 });
  assert.deepEqual(insertAtSelection("ab\ncd", 2, 2, image), { value: `ab\n${image}\ncd`, caret: 2 + 1 + image.length + 0 });
});

test("a selection is replaced and out-of-range positions are kept inside the text", () => {
  assert.equal(insertAtSelection("one two", 4, 7, "X").value, "one \nX\n");
  assert.equal(insertAtSelection("abc", 99, 120, "X").value, "abc\nX\n");
  assert.equal(insertAtSelection("abc", -5, -1, "X").value, "X\nabc");
});
