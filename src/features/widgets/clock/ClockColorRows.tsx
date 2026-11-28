import { SettingsChoice } from "../../../components/settings/SettingsChoice";
import { SettingsColor } from "../../../components/settings/SettingsColor";
import { SettingsRow } from "../../../components/settings/SettingsRow";
import { useTranslation } from "../../../i18n";
import { useClockColor } from "./useClockColor";

/** Under the clock's switch: follow the wallpaper, or a colour of the user's own with its picker. */
export function ClockColorRows() {
  const text = useTranslation().settings.widgets;
  const { settings, update } = useClockColor();

  return (
    <>
      <SettingsRow
        indent
        title={text.clockColor}
        description={text.clockColorHint}
        control={
          <SettingsChoice
            value={settings.mode}
            ariaLabel={text.clockColor}
            options={[{ value: "auto", label: text.clockColorAuto }, { value: "custom", label: text.clockColorCustom }]}
            onChange={(mode) => update({ ...settings, mode })}
          />
        }
      />
      {settings.mode === "custom" && (
        <SettingsRow
          indent
          title={text.clockCustomColor}
          control={<SettingsColor value={settings.color} ariaLabel={text.clockCustomColor} onChange={(color) => update({ ...settings, color })} />}
        />
      )}
    </>
  );
}
