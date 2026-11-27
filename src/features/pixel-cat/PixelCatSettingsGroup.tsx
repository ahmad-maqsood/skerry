import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import { setPixelCatSettings, usePixelCat } from "./usePixelCat";

export function PixelCatSettingsGroup() {
  const { settings } = usePixelCat();
  const t = useTranslation().pixelCat;
  return (
    <SettingsGroup title={t.title}>
      <SettingsToggleRow
        title={t.show}
        description={t.description}
        checked={settings.enabled}
        onChange={(enabled) => setPixelCatSettings({ ...settings, enabled })}
      />
    </SettingsGroup>
  );
}
