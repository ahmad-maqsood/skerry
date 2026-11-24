import assert from "node:assert/strict";
import test from "node:test";
import { COPY_POPUP_MAX_CHARS, copiedTextSince, copyPopupText, newestCopiedAt } from "../../src/features/clipboard/copyPopup.ts";
import { isNewTrack, playingTrackKey } from "../../src/features/media/trackPopup.ts";
import { chargerChange } from "../../src/features/system-monitor/chargerPopup.ts";
import { normalizeSettings } from "../../src/features/appearance/settings.ts";

const text = (id, copiedAt, body, extra = {}) => ({ id, kind: "text", hash: id, createdAt: copiedAt, copiedAt, preview: body, text: body, ...extra });

test("the newest copy time is the latest of all items, 0 for none", () => {
  assert.equal(newestCopiedAt([]), 0);
  assert.equal(newestCopiedAt([text("a", 5, "x"), text("b", 9, "y"), text("c", 7, "z")]), 9);
});

test("only text copied after the last one seen is announced, the newest first", () => {
  const items = [text("a", 5, "old"), text("b", 9, "newest"), text("c", 7, "newer")];
  assert.equal(copiedTextSince(items, 9), null);
  assert.equal(copiedTextSince(items, 6).id, "b");
  assert.equal(copiedTextSince(items, 0).id, "b");
  assert.equal(copiedTextSince([{ ...text("i", 20, ""), kind: "image" }], 0), null);
  assert.equal(copiedTextSince([text("blank", 20, "   \n ")], 0), null);
});

test("the popup text is one trimmed line, cut with an ellipsis", () => {
  assert.equal(copyPopupText({ preview: "", text: "  hello\n\n  world\t! " }), "hello world !");
  assert.equal(copyPopupText({ preview: "from preview" }), "from preview");
  const long = copyPopupText({ preview: "", text: "word ".repeat(100) });
  assert.ok(long.length <= COPY_POPUP_MAX_CHARS);
  assert.ok(long.endsWith("…"));
});

test("a song counts once, and resuming it after a pause is not a new song", () => {
  const playing = { playbackStatus: "playing", title: "Song", artist: "Band", trackId: null };
  const key = playingTrackKey(playing);
  assert.ok(key);
  assert.equal(playingTrackKey({ ...playing, playbackStatus: "paused" }), null);
  assert.equal(playingTrackKey({ ...playing, title: null }), null);
  assert.equal(playingTrackKey({ ...playing, trackId: "id-1" }), "id-1");
  assert.notEqual(playingTrackKey({ ...playing, artist: "Other" }), key);
  assert.equal(isNewTrack(undefined, key), false, "already playing at start");
  assert.equal(isNewTrack(null, key), true, "first song after nothing");
  assert.equal(isNewTrack(key, key), false, "resumed");
  assert.equal(isNewTrack("other", key), true, "next song");
  assert.equal(isNewTrack("other", null), false, "paused");
});

test("the pop-ups are on unless switched off", () => {
  for (const key of ["clipboardPopup", "musicPopup", "chargerPopup", "bluetoothPopup", "airplanePopup"]) {
    for (const value of [undefined, null, "false", 0, {}, true]) {
      assert.equal(normalizeSettings({ [key]: value })[key], true, key);
    }
    assert.equal(normalizeSettings({ [key]: false })[key], false, key);
  }
});

test("the charger is announced only when it changes, never for the first reading", () => {
  assert.equal(chargerChange(undefined, true), null, "already plugged in at start");
  assert.equal(chargerChange(undefined, false), null, "already on battery at start");
  assert.equal(chargerChange(true, true), null);
  assert.equal(chargerChange(false, false), null);
  assert.equal(chargerChange(false, true), "plugged");
  assert.equal(chargerChange(true, false), "unplugged");
});

test("a Bluetooth device is announced once it connects, never for the first reading", async () => {
  const { newBluetoothDevices, BLUETOOTH_COOLDOWN_MS } = await import("../../src/features/device-status/bluetoothPopup.ts");
  const none = new Map();
  assert.deepEqual(newBluetoothDevices(undefined, [{ name: "Buds" }], none, 0), [], "already connected at start");
  assert.deepEqual(newBluetoothDevices(new Set(["buds"]), [{ name: "Buds" }], none, 0), [], "still connected");
  assert.deepEqual(newBluetoothDevices(new Set(), [{ name: " Buds " }, { name: "BUDS" }, { name: "  " }], none, 0), ["Buds"], "one name, trimmed, blanks and repeats ignored");
  assert.deepEqual(newBluetoothDevices(new Set(["buds"]), [{ name: "Buds" }, { name: "Mouse" }], none, 0), ["Mouse"]);
  const announced = new Map([["buds", 1000]]);
  assert.deepEqual(newBluetoothDevices(new Set(), [{ name: "Buds" }], announced, 1000 + BLUETOOTH_COOLDOWN_MS - 1), [], "a device that keeps dropping is not repeated");
  assert.deepEqual(newBluetoothDevices(new Set(), [{ name: "Buds" }], announced, 1000 + BLUETOOTH_COOLDOWN_MS), ["Buds"]);
});

test("airplane mode is announced only when it switches, never for the first reading", async () => {
  const { airplaneChange } = await import("../../src/features/device-status/airplanePopup.ts");
  assert.equal(airplaneChange(undefined, true), null, "already on at start");
  assert.equal(airplaneChange(undefined, false), null, "already off at start");
  assert.equal(airplaneChange(true, true), null);
  assert.equal(airplaneChange(false, false), null);
  assert.equal(airplaneChange(false, true), "on");
  assert.equal(airplaneChange(true, false), "off");
});
