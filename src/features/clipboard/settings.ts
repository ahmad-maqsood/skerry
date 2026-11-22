import { clamp } from "../../utils/number.ts";
import type { ClipboardHistorySettings, ClipboardHistorySnapshot } from "./api";
import { DEFAULT_CLIPBOARD_SHORTCUT, normalizeClipboardShortcut } from "./shortcut.ts";

export const DEFAULT_CLIPBOARD_HISTORY: ClipboardHistorySnapshot = {
  settings: {
    enabled: true,
    paused: false,
    captureImages: true,
    maxItems: 200,
    shortcut: DEFAULT_CLIPBOARD_SHORTCUT,
    shortcutEnabled: true,
    retentionDays: 0,
    imageCacheBudgetMb: 500,
  },
  items: [],
  recoveredFromBackup: false,
};

export function normalizeClipboardSettings(
  settings: ClipboardHistorySettings,
): ClipboardHistorySettings {
  const retention = settings.retentionDays ?? 0;
  const budget = settings.imageCacheBudgetMb ?? 500;
  return {
    ...settings,
    paused: Boolean(settings.paused),
    maxItems: clamp(Number.isFinite(settings.maxItems) ? Math.round(settings.maxItems) : 200, 5, 1000),
    shortcut: normalizeClipboardShortcut(settings.shortcut),
    shortcutEnabled: settings.shortcutEnabled !== false,
    retentionDays: [0, 7, 30, 90].includes(retention) ? retention : 0,
    imageCacheBudgetMb: [100, 250, 500, 1000, 2000].includes(budget) ? budget : 500,
  };
}
