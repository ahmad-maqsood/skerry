import { SettingsNumberRow } from "../../../components/settings/SettingsNumberRow";
import { useTranslation } from "../../../i18n";
import { CLOCK_WIDTH } from "./size";
import { useClockSize } from "./useClockSize";

/** Under the clock's switch: how wide the widget is on the desktop, in pixels. */
export function ClockSizeRow() {
  const text = useTranslation().settings.widgets;
  const { width, update } = useClockSize();

  return (
    <SettingsNumberRow
      indent
      title={text.clockSize}
      description={text.clockSizeHint}
      unit={text.clockSizeUnit}
      value={width}
      min={CLOCK_WIDTH.min}
      max={CLOCK_WIDTH.max}
      step={10}
      onChange={update}
    />
  );
}
