import { readJson, writeJson } from "../../lib/storage.ts";
import {
  DEFAULT_SYSTEM_SETTINGS,
  type CollapsedChipStyle,
  type NetworkSpeedUnit,
  type RefreshIntervalChoice,
  type SystemSettings,
} from "./types.ts";

export { DEFAULT_SYSTEM_SETTINGS } from "./types.ts";
export const SYSTEM_SETTINGS_KEY = "skerry-system-settings";

export function normalizeSystemSettings(raw: unknown): SystemSettings {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
  const record = raw as Record<string, unknown>;

  const interval = record.refreshIntervalSeconds;
  const refreshIntervalSeconds: RefreshIntervalChoice =
    interval === 1 || interval === 2 || interval === 5 ? interval : DEFAULT_SYSTEM_SETTINGS.refreshIntervalSeconds;

  const unit = record.networkSpeedUnit;
  const networkSpeedUnit: NetworkSpeedUnit =
    unit === "bits" || unit === "bytes" ? unit : DEFAULT_SYSTEM_SETTINGS.networkSpeedUnit;

  const chipStyle = record.collapsedChipStyle;
  const collapsedChipStyle: CollapsedChipStyle =
    chipStyle === "ring" || chipStyle === "text" ? chipStyle : DEFAULT_SYSTEM_SETTINGS.collapsedChipStyle;

  return {
    enabled: record.enabled !== false,
    refreshIntervalSeconds,
    networkSpeedUnit,
    showCollapsedChip: record.showCollapsedChip === true,
    collapsedChipStyle,
    showCpu: record.showCpu !== false,
    showMemory: record.showMemory !== false,
    showDisk: record.showDisk !== false,
    showNetwork: record.showNetwork !== false,
    showWifi: record.showWifi !== false,
    showQuickControls: record.showQuickControls !== false,
  };
}

export function loadSystemSettings(): SystemSettings {
  return normalizeSystemSettings(readJson(SYSTEM_SETTINGS_KEY));
}

export function saveSystemSettings(settings: SystemSettings): void {
  writeJson(SYSTEM_SETTINGS_KEY, normalizeSystemSettings(settings));
}
