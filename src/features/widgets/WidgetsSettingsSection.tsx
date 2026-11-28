import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { ClockColorRows } from "./clock/ClockColorRows";
import { ClockSizeRow } from "./clock/ClockSizeRow";
import { useTranslation } from "../../i18n";
import { useWidgets } from "./useWidgets";

/** Settings → Advanced → Widgets: small movable windows on the desktop, each off until switched on. */
export function WidgetsSettingsSection() {
  const text = useTranslation().settings.widgets;
  const { state, error, toggle } = useWidgets();

  return (
    <SettingsGroup title={text.title} footer={text.footer}>
      <SettingsToggleRow
        title={text.clock}
        description={<>{text.clockHint}{error ? <><br /><span role="status">{error}</span></> : null}</>}
        checked={state?.clock ?? false}
        disabled={!state}
        onChange={(enabled) => void toggle("clock", enabled)}
      />
      {state?.clock && <ClockSizeRow />}
      {state?.clock && <ClockColorRows />}
    </SettingsGroup>
  );
}
