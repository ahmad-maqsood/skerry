import { useTranslation, type LocaleCode } from "../../i18n";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import type { ReactNode } from "react";

/** Settings → General → System: start with Windows and where settings open. */
export function BehaviorSettingsSection({
  launchAtStartup,
  launchAtStartupError,
  detachedSettings,
  onLaunchAtStartupChange,
  onDetachedSettingsChange,
  children,
}: {
  launchAtStartup: boolean;
  /** Why Windows kept its own setting after the switch was last used. */
  launchAtStartupError?: string | null;
  /** Whether settings open in their own window instead of as a page of the island. */
  detachedSettings: boolean;
  onDetachedSettingsChange: (detached: boolean) => void;
  locale?: LocaleCode;
  onLaunchAtStartupChange: (enabled: boolean) => void;
  onLocaleChange?: (locale: LocaleCode) => void;
  children?: ReactNode;
}) {
  const t = useTranslation();

  return (
    <SettingsGroup title={t.settings.behavior.title}>
      <SettingsToggleRow
        title={t.settings.layout.launchAtStartup}
        description={launchAtStartupError ?? undefined}
        checked={launchAtStartup}
        onChange={onLaunchAtStartupChange}
      />
      <SettingsToggleRow
        title={t.settings.behavior.detachedSettings}
        description={t.settings.behavior.detachedSettingsHint}
        checked={detachedSettings}
        onChange={onDetachedSettingsChange}
      />
      {children}
    </SettingsGroup>
  );
}
