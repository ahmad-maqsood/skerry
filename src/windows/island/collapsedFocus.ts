import type { CollapsedSlot } from "../../features/appearance/types";
import { isTodoTimerEndingSoon, type TodoTimer } from "../../features/todos/timer.ts";

/**
 * Whether the bar gives its whole width to one alert: a notification, a new song or another pop-up
 * (any message preview), or a todo round reminding that it is about to end or has ended. The
 * layout must place the text, which is what shows the alert.
 */
export function isCollapsedFocused({
  hasPreview,
  todoTimer,
  showsTodo,
  layout,
}: {
  hasPreview: boolean;
  todoTimer: TodoTimer | null;
  /** The todo is what the text shows now (its title is set and Settings → Appearance picked it). */
  showsTodo: boolean;
  layout: readonly CollapsedSlot[];
}): boolean {
  if (!layout.includes("text")) return false;
  const todoReminding = showsTodo && todoTimer !== null && (todoTimer.notified || isTodoTimerEndingSoon(todoTimer));
  return hasPreview || todoReminding;
}

/** While focused only the text stays; the minimize button is outside the slots and always stays. */
export function visibleCollapsedSlots(layout: readonly CollapsedSlot[], focused: boolean): readonly CollapsedSlot[] {
  return focused ? layout.filter((slot) => slot === "text") : layout;
}
