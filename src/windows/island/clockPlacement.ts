import type { CollapsedItem } from "../../features/appearance/types";

/**
 * Whether the collapsed bar is quiet enough for the clock to take its centre: no song playing, and
 * the text showing at most the app's name or the todo count. A lyric line or a task's title needs
 * the room, so the clock then sits where Settings → Appearance put it. (A pop-up hides it.)
 */
export function wantsCentredClock({ musicPlaying, collapsedItem, taskTitle }: {
  musicPlaying: boolean;
  collapsedItem: CollapsedItem | null;
  taskTitle: string | null;
}) {
  return !musicPlaying && collapsedItem !== "lyrics" && !(collapsedItem === "todo" && taskTitle !== null);
}

/**
 * The narrowest bar that holds the clock in its centre without anything reaching under it: both
 * halves get the room the fuller side needs.
 */
export function centredClockBarWidth({ left, right, clock, padding, gap }: {
  left: number;
  right: number;
  clock: number;
  padding: number;
  gap: number;
}) {
  return Math.ceil(clock + 2 * (padding + Math.max(left, right) + gap));
}
