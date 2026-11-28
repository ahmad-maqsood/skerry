import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { WidgetBackdrop } from "./clock/ink";

/** Mirrors WidgetsState in src-tauri/src/widgets/model.rs. */
export type WidgetsState = { clock: boolean };
/** The widgets that can be switched on; each has a window labelled `widget-<id>`. */
export type WidgetId = "clock";

export function getWidgets() {
  return invoke<WidgetsState>("get_widgets");
}

export function setWidget(widget: WidgetId, enabled: boolean) {
  return invoke<WidgetsState>("set_widget", { widget, enabled });
}

/** Keeps where the widget is now, for the next start. */
export function saveWidgetPosition() {
  return invoke<void>("save_widget_position");
}

/** What is behind the widget right now; null where the desktop cannot be read. */
export function sampleWidgetBackdrop() {
  return invoke<WidgetBackdrop | null>("sample_widget_backdrop");
}

/** Fires as the widget's own window is dragged; resolves to the unlisten function. */
export function listenWidgetMoved(handler: () => void) {
  return getCurrentWindow().onMoved(() => handler());
}

/** Sizes the widget's own window, in logical pixels; its top left corner stays where it is. */
export function resizeWidget(width: number, height: number) {
  return getCurrentWindow().setSize(new LogicalSize(width, height));
}
