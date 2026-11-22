import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsNumberRow } from "../../components/settings/SettingsNumberRow";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { SettingsSelect } from "../../components/settings/SettingsSelect";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import type { ClipboardHistorySettings } from "./api";
import { CLIPBOARD_VISIBLE_ROWS } from "../appearance/settingsLimits";

/**
 * The clipboard history options below the module switch (which is `enabled`, set by the
 * page): what is recorded, retention and image budget, then how the list shows.
 */
export function ClipboardSettingsSection({
  clipboardSettings,
  onClipboardSettingsChange,
  visibleRows,
  onVisibleRowsChange,
  detached,
  onDetachedChange,
  closeOnBlur,
  onCloseOnBlurChange,
}: {
  clipboardSettings: ClipboardHistorySettings;
  onClipboardSettingsChange: (settings: ClipboardHistorySettings) => void;
  visibleRows: number;
  onVisibleRowsChange: (rows: number) => void;
  detached: boolean;
  onDetachedChange: (detached: boolean) => void;
  closeOnBlur: boolean;
  onCloseOnBlurChange: (closeOnBlur: boolean) => void;
}) {
  const t = useTranslation();

  return (
    <>
      <SettingsGroup title={t.settings.clipboard.title}>
        <SettingsToggleRow
          title={t.settings.clipboard.paused}
          description={t.settings.clipboard.pausedHint}
          checked={clipboardSettings.paused ?? false}
          onChange={(paused) => onClipboardSettingsChange({ ...clipboardSettings, paused })}
        />
        <SettingsToggleRow
          title={t.settings.clipboard.captureImages}
          checked={clipboardSettings.captureImages}
          onChange={(captureImages) => onClipboardSettingsChange({ ...clipboardSettings, captureImages })}
        />
        <SettingsNumberRow
          title={t.settings.clipboard.maxItems}
          value={clipboardSettings.maxItems}
          min={5}
          max={1000}
          onChange={(maxItems) => onClipboardSettingsChange({ ...clipboardSettings, maxItems })}
        />
        <SettingsRow title={t.settings.clipboard.retention}>
          <SettingsSelect
            value={String(clipboardSettings.retentionDays ?? 0)}
            options={[
              { value: "0", label: t.settings.clipboard.retentionForever },
              { value: "90", label: t.settings.clipboard.retention90Days },
              { value: "30", label: t.settings.clipboard.retention30Days },
              { value: "7", label: t.settings.clipboard.retention7Days },
            ]}
            ariaLabel={t.settings.clipboard.retention}
            onChange={(val) => onClipboardSettingsChange({ ...clipboardSettings, retentionDays: Number(val) })}
          />
        </SettingsRow>
        <SettingsRow title={t.settings.clipboard.imageCacheBudget}>
          <SettingsSelect
            value={String(clipboardSettings.imageCacheBudgetMb ?? 500)}
            options={[
              { value: "100", label: "100 MB" },
              { value: "250", label: "250 MB" },
              { value: "500", label: "500 MB" },
              { value: "1000", label: "1 GB" },
              { value: "2000", label: "2 GB" },
            ]}
            ariaLabel={t.settings.clipboard.imageCacheBudget}
            onChange={(val) => onClipboardSettingsChange({ ...clipboardSettings, imageCacheBudgetMb: Number(val) })}
          />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title={t.settings.clipboard.displayTitle}>
        <SettingsNumberRow
          title={t.settings.clipboard.visibleRows}
          value={visibleRows}
          min={CLIPBOARD_VISIBLE_ROWS.min}
          max={CLIPBOARD_VISIBLE_ROWS.max}
          onChange={onVisibleRowsChange}
        />
        <SettingsToggleRow title={t.settings.clipboard.detached} checked={detached} onChange={onDetachedChange} />
        {detached && (
          <SettingsToggleRow
            indent
            title={t.settings.clipboard.closeOnBlur}
            description={t.settings.clipboard.closeOnBlurHint}
            checked={closeOnBlur}
            onChange={onCloseOnBlurChange}
          />
        )}
      </SettingsGroup>
    </>
  );
}
