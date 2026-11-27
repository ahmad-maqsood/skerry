import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import { setPixelCatSettings, usePixelCat } from "./usePixelCat";

/** `onShown` runs when the cat is switched on, so the page can turn the time off in its place. */
export function PixelCatSettingsGroup({ onShown }: { onShown?: () => void }) {
  const { settings } = usePixelCat();
  const t = useTranslation().pixelCat;
  return (
    <SettingsGroup title={t.title}>
      <SettingsToggleRow
        title={t.show}
        description={t.description}
        checked={settings.enabled}
        onChange={(enabled) => {
          setPixelCatSettings({ ...settings, enabled });
          if (enabled) onShown?.();
        }}
      />
    </SettingsGroup>
  );
}
