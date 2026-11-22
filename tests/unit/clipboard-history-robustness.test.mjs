import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CLIPBOARD_HISTORY, normalizeClipboardSettings } from "../../src/features/clipboard/settings.ts";

test("default clipboard history settings have robust defaults", () => {
  const { settings, recoveredFromBackup } = DEFAULT_CLIPBOARD_HISTORY;
  assert.equal(settings.enabled, true);
  assert.equal(settings.paused, false);
  assert.equal(settings.captureImages, true);
  assert.equal(settings.maxItems, 200);
  assert.equal(settings.retentionDays, 0);
  assert.equal(settings.imageCacheBudgetMb, 500);
  assert.equal(recoveredFromBackup, false);
});

test("clipboard settings normalize retention options", () => {
  const base = DEFAULT_CLIPBOARD_HISTORY.settings;
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: 0 }).retentionDays, 0);
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: 7 }).retentionDays, 7);
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: 30 }).retentionDays, 30);
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: 90 }).retentionDays, 90);
  // Invalid values fall back to 0 (Forever)
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: 14 }).retentionDays, 0);
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: -5 }).retentionDays, 0);
  assert.equal(normalizeClipboardSettings({ ...base, retentionDays: undefined }).retentionDays, 0);
});

test("clipboard settings normalize image cache budget options", () => {
  const base = DEFAULT_CLIPBOARD_HISTORY.settings;
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 100 }).imageCacheBudgetMb, 100);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 250 }).imageCacheBudgetMb, 250);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 500 }).imageCacheBudgetMb, 500);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 1000 }).imageCacheBudgetMb, 1000);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 2000 }).imageCacheBudgetMb, 2000);
  // Invalid values fall back to 500 MB
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 350 }).imageCacheBudgetMb, 500);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: 0 }).imageCacheBudgetMb, 500);
  assert.equal(normalizeClipboardSettings({ ...base, imageCacheBudgetMb: undefined }).imageCacheBudgetMb, 500);
});

test("clipboard settings toggle paused state correctly", () => {
  const base = DEFAULT_CLIPBOARD_HISTORY.settings;
  assert.equal(normalizeClipboardSettings({ ...base, paused: true }).paused, true);
  assert.equal(normalizeClipboardSettings({ ...base, paused: false }).paused, false);
  assert.equal(normalizeClipboardSettings({ ...base, paused: undefined }).paused, false);
});
