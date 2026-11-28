import { ClockWidget } from "../../features/widgets/clock/ClockWidget";

/** The window of one desktop widget, picked by its `?window=widget-<id>` kind. */
export function WidgetWindow({ kind }: { kind: string }) {
  return kind === "widget-clock" ? <ClockWidget /> : null;
}
