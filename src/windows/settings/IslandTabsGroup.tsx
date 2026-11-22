import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import type { IslandSettings } from "../../features/appearance/types";
import { useClipboardSettings } from "../../features/clipboard/useClipboardSettings";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { useSystemMonitor } from "../../features/system-monitor/useSystemMonitor";
import { useTranslation } from "../../i18n";
import { onlyOneTabOn } from "./islandTabs";

/**
 * Settings → General → Island tabs: one switch per tab of the expanded island, in the order the
 * tabs are listed. Each switch is the same one as on that module's own page, so the two agree.
 */
export function IslandTabsGroup({
  settings,
  onSettingsChange,
  systemNotifications,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
  systemNotifications: SystemNotificationsController;
}) {
  const text = useTranslation().settings.modules;
  const [clipboardSettings, updateClipboardSettings] = useClipboardSettings();
  const { updateSettings: updateSystemMonitor } = useSystemMonitor(false);

  const tabs = [
    {
      id: "todo",
      title: text.tabTodo,
      checked: settings.todoEnabled,
      onChange: (todoEnabled: boolean) => onSettingsChange({ ...settings, todoEnabled }),
    },
    {
      id: "music",
      title: text.tabMusic,
      checked: settings.musicEnabled,
      onChange: (musicEnabled: boolean) => onSettingsChange({ ...settings, musicEnabled }),
    },
    {
      id: "clipboard",
      title: text.tabClipboard,
      checked: clipboardSettings.enabled,
      onChange: (enabled: boolean) => updateClipboardSettings({ ...clipboardSettings, enabled }),
    },
    {
      id: "shelf",
      title: text.tabShelf,
      checked: settings.shelfEnabled,
      onChange: (shelfEnabled: boolean) => onSettingsChange({ ...settings, shelfEnabled }),
    },
    {
      id: "messages",
      title: text.tabMessages,
      checked: systemNotifications.snapshot.enabled,
      onChange: (enabled: boolean) => void systemNotifications.setEnabled(enabled),
    },
    {
      id: "translation",
      title: text.tabTranslation,
      checked: settings.translationEnabled,
      onChange: (translationEnabled: boolean) => onSettingsChange({ ...settings, translationEnabled }),
    },
    {
      id: "system",
      title: text.tabSystem,
      checked: settings.systemMonitorEnabled,
      // The island hides the tab by systemMonitorEnabled; the monitor's own switch stops its sampling.
      onChange: (systemMonitorEnabled: boolean) => {
        onSettingsChange({ ...settings, systemMonitorEnabled });
        updateSystemMonitor({ enabled: systemMonitorEnabled });
      },
    },
  ];
  const lastOne = onlyOneTabOn(tabs.map((tab) => tab.checked));

  return (
    <SettingsGroup title={text.tabsTitle} footer={lastOne ? text.tabsLastOne : text.tabsHint}>
      {tabs.map((tab) => (
        <SettingsToggleRow
          key={tab.id}
          title={tab.title}
          checked={tab.checked}
          disabled={lastOne && tab.checked}
          onChange={tab.onChange}
        />
      ))}
    </SettingsGroup>
  );
}
