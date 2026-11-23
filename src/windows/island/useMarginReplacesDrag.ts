import { useEffect, useRef, type MutableRefObject } from "react";
import * as islandApi from "./api";
import { clearIslandPosition, type IslandPosition } from "./storage";

/**
 * A dragged position ignores the top margin, so typing a new "Distance from top" (Settings →
 * General → Position) drops the dragged position and lets the margin place the island.
 */
export function useMarginReplacesDrag(
  marginY: number,
  positionRef: MutableRefObject<IslandPosition | null>,
  setDetached: (detached: boolean) => void,
) {
  const previous = useRef(marginY);
  useEffect(() => {
    if (previous.current === marginY) return;
    previous.current = marginY;
    if (positionRef.current === null) return;
    positionRef.current = null;
    setDetached(false);
    clearIslandPosition();
    void islandApi.resetIslandPosition().catch((error) => {
      console.error("Failed to drop the dragged position for the new margin", error);
    });
  }, [marginY, positionRef, setDetached]);
}
