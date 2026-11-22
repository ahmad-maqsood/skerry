import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBatteryTime,
  formatBytes,
  formatPercent,
  formatRate,
  formatUptime,
} from "../../src/features/system-monitor/formatters.ts";
import {
  DEFAULT_SYSTEM_SETTINGS,
  normalizeSystemSettings,
} from "../../src/features/system-monitor/storage.ts";

test("formatBytes formats bytes to human-readable units", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-10), "0 B");
  assert.equal(formatBytes(500), "500 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1048576), "1.0 MB");
  assert.equal(formatBytes(1073741824), "1.0 GB");
  assert.equal(formatBytes(1099511627776), "1.0 TB");
});

test("formatRate formats byte rate to auto Bytes/s or Bits/s", () => {
  // Bytes mode
  assert.equal(formatRate(0, "bytes"), "0 KB/s");
  assert.equal(formatRate(500, "bytes"), "500 B/s");
  assert.equal(formatRate(10240, "bytes"), "10.0 KB/s");
  assert.equal(formatRate(1048576, "bytes"), "1.0 MB/s");
  assert.equal(formatRate(5242880, "bytes"), "5.0 MB/s");

  // Bits mode (bytes * 8)
  assert.equal(formatRate(0, "bits"), "0 Kbps");
  assert.equal(formatRate(50, "bits"), "400 bps");
  assert.equal(formatRate(12500, "bits"), "100.0 Kbps");
  assert.equal(formatRate(125000, "bits"), "1.0 Mbps");
  assert.equal(formatRate(12500000, "bits"), "100.0 Mbps");
});

test("formatPercent clamps and formats percentages", () => {
  assert.equal(formatPercent(0), "0%");
  assert.equal(formatPercent(23.4), "23%");
  assert.equal(formatPercent(23.6), "24%");
  assert.equal(formatPercent(-10), "0%");
  assert.equal(formatPercent(120), "100%");
  assert.equal(formatPercent(Number.NaN), "0%");
});

test("formatUptime and formatBatteryTime format seconds to readable times", () => {
  assert.equal(formatUptime(0), "0m");
  assert.equal(formatUptime(59), "0m");
  assert.equal(formatUptime(60), "1m");
  assert.equal(formatUptime(3600), "1h 0m");
  assert.equal(formatUptime(3665), "1h 1m");
  assert.equal(formatUptime(86400), "1d 0h");
  assert.equal(formatUptime(90000), "1d 1h");

  assert.equal(formatBatteryTime(0), "");
  assert.equal(formatBatteryTime(1800), "30m");
  assert.equal(formatBatteryTime(7200), "2h 0m");
  assert.equal(formatBatteryTime(7260), "2h 1m");
});

test("normalizeSystemSettings normalizes and defaults correctly", () => {
  assert.deepEqual(normalizeSystemSettings(null), DEFAULT_SYSTEM_SETTINGS);
  assert.deepEqual(normalizeSystemSettings(undefined), DEFAULT_SYSTEM_SETTINGS);
  assert.deepEqual(normalizeSystemSettings("invalid"), DEFAULT_SYSTEM_SETTINGS);

  const custom = {
    enabled: false,
    refreshIntervalSeconds: 5,
    networkSpeedUnit: "bits",
    showCollapsedChip: true,
    collapsedChipStyle: "ring",
    showCpu: false,
    showMemory: true,
    showDisk: false,
    showNetwork: true,
    showWifi: false,
  };

  assert.deepEqual(normalizeSystemSettings(custom), custom);

  // Invalid options fall back to defaults
  const invalidOptions = {
    refreshIntervalSeconds: 10,
    networkSpeedUnit: "invalid",
    collapsedChipStyle: "spark",
  };
  const normalized = normalizeSystemSettings(invalidOptions);
  assert.equal(normalized.refreshIntervalSeconds, DEFAULT_SYSTEM_SETTINGS.refreshIntervalSeconds);
  assert.equal(normalized.networkSpeedUnit, DEFAULT_SYSTEM_SETTINGS.networkSpeedUnit);
  assert.equal(normalized.collapsedChipStyle, DEFAULT_SYSTEM_SETTINGS.collapsedChipStyle);
});
