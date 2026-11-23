import type { ReactNode } from "react";
import { SettingsChoice, type SettingsChoiceOption } from "../../components/settings/SettingsChoice.tsx";
import { SettingsGroup } from "../../components/settings/SettingsGroup.tsx";
import { SettingsRow } from "../../components/settings/SettingsRow.tsx";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow.tsx";
import { useTranslation } from "../../i18n";
import { ModuleSwitchSection } from "../../windows/settings/ModuleSwitchSection.tsx";
import { usePrivacySettings } from "../privacy";
import type { IslandSettings } from "../appearance/types.ts";
import type { CollapsedChipStyle, NetworkSpeedUnit, RefreshIntervalChoice } from "./types.ts";
import { useSystemMonitor } from "./useSystemMonitor.ts";

export function SystemSettingsPage({
  islandSettings,
  onIslandSettingsChange,
}: {
  islandSettings: IslandSettings;
  onIslandSettingsChange: (settings: IslandSettings) => void;
}): ReactNode {
  const t = useTranslation();
  const text = t.settings.systemMonitor;
  const { settings, updateSettings } = useSystemMonitor(false);
  const privacy = usePrivacySettings();

  const intervalOptions: readonly SettingsChoiceOption<string>[] = [
    { value: "1", label: text.interval1s },
    { value: "2", label: text.interval2s },
    { value: "5", label: text.interval5s },
  ];

  const unitOptions: readonly SettingsChoiceOption<NetworkSpeedUnit>[] = [
    { value: "bytes", label: text.unitBytes },
    { value: "bits", label: text.unitBits },
  ];

  const chipStyleOptions: readonly SettingsChoiceOption<CollapsedChipStyle>[] = [
    { value: "text", label: text.chipStyleText },
    { value: "ring", label: text.chipStyleRing },
  ];

  return (
    <>
      <ModuleSwitchSection
        label={t.settings.modules.system}
        checked={islandSettings.systemMonitorEnabled}
        onChange={(enabled) => {
          // The island hides the tab by systemMonitorEnabled; the monitor's own switch stops its sampling.
          onIslandSettingsChange({ ...islandSettings, systemMonitorEnabled: enabled });
          updateSettings({ enabled });
        }}
      />

      {islandSettings.systemMonitorEnabled && settings.enabled && (
        <>
          <SettingsGroup title={text.samplingGroup}>
            <SettingsRow title={text.refreshInterval} description={text.refreshIntervalDesc}>
              <SettingsChoice
                value={String(settings.refreshIntervalSeconds)}
                options={intervalOptions}
                ariaLabel={text.refreshInterval}
                onChange={(val) => updateSettings({ refreshIntervalSeconds: Number(val) as RefreshIntervalChoice })}
              />
            </SettingsRow>

            <SettingsRow title={text.networkSpeedUnit} description={text.networkSpeedUnitDesc}>
              <SettingsChoice
                value={settings.networkSpeedUnit}
                options={unitOptions}
                ariaLabel={text.networkSpeedUnit}
                onChange={(networkSpeedUnit) => updateSettings({ networkSpeedUnit })}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title={text.collapsedGroup} footer={text.collapsedHint}>
            <SettingsToggleRow
              title={text.showCollapsedChip}
              description={text.showCollapsedChipDesc}
              checked={settings.showCollapsedChip}
              onChange={(showCollapsedChip) => updateSettings({ showCollapsedChip })}
            />

            {settings.showCollapsedChip && (
              <SettingsRow title={text.chipStyle} description={text.chipStyleDesc}>
                <SettingsChoice
                  value={settings.collapsedChipStyle}
                  options={chipStyleOptions}
                  ariaLabel={text.chipStyle}
                  onChange={(collapsedChipStyle) => updateSettings({ collapsedChipStyle })}
                />
              </SettingsRow>
            )}
          </SettingsGroup>

          <SettingsGroup title={text.cardsGroup}>
            <SettingsToggleRow
              title={text.showCpu}
              checked={settings.showCpu}
              onChange={(showCpu) => updateSettings({ showCpu })}
            />
            <SettingsToggleRow
              title={text.showMemory}
              checked={settings.showMemory}
              onChange={(showMemory) => updateSettings({ showMemory })}
            />
            <SettingsToggleRow
              title={text.showDisk}
              checked={settings.showDisk}
              onChange={(showDisk) => updateSettings({ showDisk })}
            />
            <SettingsToggleRow
              title={text.showNetwork}
              checked={settings.showNetwork}
              onChange={(showNetwork) => updateSettings({ showNetwork })}
            />
            <SettingsToggleRow
              title={text.showWifi}
              checked={settings.showWifi}
              onChange={(showWifi) => updateSettings({ showWifi })}
            />
            <SettingsToggleRow
              title={text.showQuickControls}
              description={text.showQuickControlsDesc}
              checked={settings.showQuickControls}
              onChange={(showQuickControls) => updateSettings({ showQuickControls })}
            />
          </SettingsGroup>
        </>
      )}

      {/* Outside the System module's switch: the dot belongs to the collapsed island, not the System page. */}
      <SettingsGroup title={text.privacyGroup} footer={text.privacyHint}>
        <SettingsToggleRow
          title={text.privacyIndicator}
          description={text.privacyIndicatorDesc}
          checked={privacy.settings.enabled}
          onChange={(enabled) => privacy.updateSettings({ enabled })}
        />
      </SettingsGroup>
    </>
  );
}
