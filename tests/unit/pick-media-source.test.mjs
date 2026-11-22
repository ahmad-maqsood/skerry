import assert from "node:assert/strict";
import test from "node:test";
import { pickMediaSource } from "../../src/features/media/pickMediaSource.ts";

const order = [{ id: "spotify" }, { id: "appleMusic" }, { id: "chrome" }];

test("a playing player wins over a paused one ranked above it", () => {
  const sessions = [{ id: "spotify", playing: false }, { id: "appleMusic", playing: true }];
  assert.equal(pickMediaSource(sessions, order), "appleMusic");
});

test("among players playing at once, the one ranked first wins", () => {
  const sessions = [{ id: "chrome", playing: true }, { id: "appleMusic", playing: true }];
  assert.equal(pickMediaSource(sessions, order), "appleMusic");
  assert.equal(pickMediaSource(sessions, [{ id: "chrome" }, { id: "appleMusic" }]), "chrome");
});

test("with none playing the first open one is followed; none listed gives null", () => {
  assert.equal(pickMediaSource([{ id: "chrome", playing: false }, { id: "appleMusic", playing: false }], order), "appleMusic");
  assert.equal(pickMediaSource([{ id: "foobar", playing: true }], order), null);
  assert.equal(pickMediaSource([], order), null);
});
