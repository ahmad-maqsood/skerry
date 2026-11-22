import assert from "node:assert/strict";
import test from "node:test";
import { nextWheelPage, wheelPageOrder } from "../../src/windows/island/wheelPages.ts";

const features = { todo: true, music: true, clipboard: true, shelf: false, qq: true, translation: false };
const order = ["todo", "music", "clipboard", "shelf", "translation"];

test("Ctrl + wheel follows the header: the enabled page dots, then messages", () => {
  assert.deepEqual(wheelPageOrder(order, features, false), ["todo", "music", "clipboard", "qq"]);
});

test("pages that open a window of their own are skipped", () => {
  assert.deepEqual(wheelPageOrder(order, features, true), ["todo", "music", "qq"]);
  assert.deepEqual(wheelPageOrder(order, { ...features, translation: true }, false), ["todo", "music", "clipboard", "translation", "qq"]);
});

test("the wheel steps one page and wraps round the ends", () => {
  const pages = ["todo", "music", "qq"];
  assert.equal(nextWheelPage(pages, "music", 1), "qq");
  assert.equal(nextWheelPage(pages, "qq", 1), "todo");
  assert.equal(nextWheelPage(pages, "todo", -1), "qq");
  assert.equal(nextWheelPage(pages, "settings", 1), "todo");
  assert.equal(nextWheelPage(["todo"], "todo", 1), null);
  assert.equal(nextWheelPage([], "todo", 1), null);
});
