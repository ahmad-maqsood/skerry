import { ClipboardSettingsSection } from "../../features/clipboard/ClipboardSettingsSection";
import { useClipboardSettings } from "../../features/clipboard/useClipboardSettings";
import type { IslandSettings } from "../../features/appearance/types";
import { useTranslation } from "../../i18n";
import { ModuleSwitchSection } from "./ModuleSwitchSection";
import { ClipboardShortcutRows } from "../../features/clipboard/ClipboardShortcutRows";
import { ClipboardStorageRows } from "../../features/clipboard/ClipboardStorageRows";
import { useTranslationSettings } from "../../features/translation/useTranslationSettings";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { findShortcutOwner } from "./shortcutConflicts";
import { ShelfSettingsGroup } from "./ShelfSettingsGroup";
import { useMusicShortcuts } from "../../features/media/useMusicShortcuts";
import { useSettingsShortcutOwners } from "./useSettingsShortcutOwners";
import { useLaunchAtStartup } from "./useLaunchAtStartup";

/** Settings → Clipboard & files: clipboard history (switch, images, length, shortcut), then the file shelf. */
export function ClipboardSettingsPage({
  settings,
  onSettingsChange,
}: {
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const t = useTranslation();
  const [clipboardSettings, updateClipboardSettings, recoveredFromBackup] = useClipboardSettings();
  const [launchAtStartup] = useLaunchAtStartup();
  const [translationSettings] = useTranslationSettings();
  const [musicShortcuts] = useMusicShortcuts();
  const owners = useSettingsShortcutOwners(settings, clipboardSettings, translationSettings, musicShortcuts);
  const takenBy = (shortcut: string) => findShortcutOwner(shortcut, owners, "clipboard");

  return (
    <>
      <ModuleSwitchSection
        label={t.settings.modules.clipboard}
        checked={clipboardSettings.enabled}
        onChange={(enabled) => updateClipboardSettings({ ...clipboardSettings, enabled })}
      />
      {clipboardSettings.enabled && !launchAtStartup && (
        <div className="clipboard-storage__warning" role="note">
          {t.settings.clipboard.startupHint}
        </div>
      )}
      {clipboardSettings.enabled && (
        <ClipboardSettingsSection
          clipboardSettings={clipboardSettings}
          onClipboardSettingsChange={updateClipboardSettings}
          visibleRows={settings.clipboardVisibleRows}
          onVisibleRowsChange={(clipboardVisibleRows) => onSettingsChange({ ...settings, clipboardVisibleRows })}
          detached={settings.clipboardDetached}
          onDetachedChange={(clipboardDetached) => onSettingsChange({ ...settings, clipboardDetached })}
          closeOnBlur={settings.clipboardCloseOnBlur}
          onCloseOnBlurChange={(clipboardCloseOnBlur) => onSettingsChange({ ...settings, clipboardCloseOnBlur })}
        />
      )}
      {clipboardSettings.enabled && (
        <SettingsGroup title={t.settings.categories.shortcuts} footer={t.settings.shortcuts.globalHint}>
          <ClipboardShortcutRows
            clipboardSettings={clipboardSettings}
            onClipboardSettingsChange={updateClipboardSettings}
            takenBy={takenBy}
          />
        </SettingsGroup>
      )}
      {clipboardSettings.enabled && <ClipboardStorageRows recoveredFromBackup={recoveredFromBackup} />}
      <ShelfSettingsGroup settings={settings} onSettingsChange={onSettingsChange} />
    </>
  );
}
