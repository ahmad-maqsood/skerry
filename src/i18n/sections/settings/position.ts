export type SettingsPositionText = {
  title: string;
  moveHint: string;
  lock: string;
  lockHint: string;
  /** The gap under the top of the screen, typed in pixels. */
  marginRow: string;
  marginHint: string;
  unit: string;
  /** Row that puts the island back where it starts. */
  resetRow: string;
  reset: string;
};


export const en: SettingsPositionText = {
  title: "Position",
  lock: "Lock island position",
  lockHint: "Prevent moving the island by dragging. Reset remains available.",
  moveHint: "Drag the collapsed island to move it; when it is open, hold Ctrl while dragging. Dropping it within 16 px of the top snaps it flush; use Distance from top for an exact gap.",
  marginRow: "Distance from top",
  marginHint: "Pixels between the top of the screen and the island. 0 attaches it to the edge. Dragging snaps to the edge within 16 px, so type a small value here to hold it closer; setting one replaces a dragged position.",
  unit: "px",
  resetRow: "Back to the default position",
  reset: "Reset",
};
