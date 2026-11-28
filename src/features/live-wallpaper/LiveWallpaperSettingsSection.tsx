import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import { useLiveWallpaper } from "./useLiveWallpaper";

const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

/** Settings → Advanced → Live wallpaper: off by default, so an untouched install runs none of it. */
export function LiveWallpaperSettingsSection() {
  const text = useTranslation().settings.liveWallpaper;
  const { state, error, save, chooseVideo } = useLiveWallpaper();
  const settings = state?.settings;
  const status = state?.status;
  const statusText = error ?? (!status ? "" : status.kind === "error" ? status.message : text.status[status.kind]);

  return (
    <SettingsGroup title={text.title} footer={text.formats}>
      <SettingsToggleRow
        title={text.enable}
        description={<>{text.enableHint}<br /><span role="status">{statusText}</span></>}
        checked={settings?.enabled ?? false}
        disabled={!settings}
        onChange={(enabled) => { if (settings) void save({ ...settings, enabled }); }}
      />
      <SettingsRow
        title={text.video}
        description={settings?.path ? <span title={settings.path}>{fileName(settings.path)}</span> : text.noVideo}
        control={<SettingsLinkButton disabled={!settings} onClick={() => void chooseVideo(text.pickerTitle)}>{text.choose}</SettingsLinkButton>}
      />
      <SettingsToggleRow
        title={text.pauseOnBattery}
        description={text.pauseOnBatteryHint}
        checked={settings?.pauseOnBattery ?? true}
        disabled={!settings}
        onChange={(pauseOnBattery) => { if (settings) void save({ ...settings, pauseOnBattery }); }}
      />
      <SettingsRow
        title={text.scaling}
        description={text.scalingHint}
        control={<SettingsChoice
          value={settings?.fit ?? "fill"}
          ariaLabel={text.scaling}
          options={[{ value: "fill", label: text.fill }, { value: "fit", label: text.fit }]}
          onChange={(fit) => { if (settings) void save({ ...settings, fit }); }}
        />}
      />
    </SettingsGroup>
  );
}
