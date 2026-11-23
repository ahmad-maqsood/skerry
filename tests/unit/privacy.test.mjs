import assert from "node:assert/strict";
import test from "node:test";
import {
  devicesInUse,
  NO_PRIVACY_ACTIVITY,
  normalizePrivacyStatus,
  samePrivacyStatus,
} from "../../src/features/privacy/privacyStatus.ts";
import {
  DEFAULT_PRIVACY_SETTINGS,
  normalizePrivacySettings,
} from "../../src/features/privacy/storage.ts";

test("devicesInUse lists the microphone before the camera", () => {
  assert.deepEqual(devicesInUse({ microphone: false, camera: false }), []);
  assert.deepEqual(devicesInUse({ microphone: true, camera: false }), ["microphone"]);
  assert.deepEqual(devicesInUse({ microphone: false, camera: true }), ["camera"]);
  assert.deepEqual(devicesInUse({ microphone: true, camera: true }), ["microphone", "camera"]);
});

test("normalizePrivacyStatus counts only a true value as in use", () => {
  assert.deepEqual(normalizePrivacyStatus(null), NO_PRIVACY_ACTIVITY);
  assert.deepEqual(normalizePrivacyStatus("on"), NO_PRIVACY_ACTIVITY);
  assert.deepEqual(normalizePrivacyStatus({ microphone: "yes", camera: 1 }), NO_PRIVACY_ACTIVITY);
  assert.deepEqual(normalizePrivacyStatus({ microphone: true, camera: false }), {
    microphone: true,
    camera: false,
  });
});

test("samePrivacyStatus compares both devices", () => {
  assert.equal(samePrivacyStatus({ microphone: true, camera: false }, { microphone: true, camera: false }), true);
  assert.equal(samePrivacyStatus({ microphone: true, camera: false }, { microphone: true, camera: true }), false);
});

test("normalizePrivacySettings defaults to showing the indicator and only an explicit false turns it off", () => {
  assert.deepEqual(normalizePrivacySettings(undefined), DEFAULT_PRIVACY_SETTINGS);
  assert.deepEqual(normalizePrivacySettings("off"), DEFAULT_PRIVACY_SETTINGS);
  assert.deepEqual(normalizePrivacySettings({}), { enabled: true });
  assert.deepEqual(normalizePrivacySettings({ enabled: false }), { enabled: false });
  assert.deepEqual(normalizePrivacySettings({ enabled: "no" }), { enabled: true });
});
