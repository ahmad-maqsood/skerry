import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "../../utils/number";

/** Moves the light of liquid glass and prism with the pointer, at most once per frame. */
export function useGlassPointer(tracksPointer: boolean) {
  const glassFrameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (glassFrameRef.current !== null) {
        window.cancelAnimationFrame(glassFrameRef.current);
      }
    },
    [],
  );

  const handleGlassPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (
        !tracksPointer ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        glassFrameRef.current !== null
      ) {
        return;
      }

      const island = event.currentTarget;
      const rect = island.getBoundingClientRect();
      const pointerX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const pointerY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

      glassFrameRef.current = window.requestAnimationFrame(() => {
        glassFrameRef.current = null;
        island.style.setProperty("--glass-pointer-x", `${pointerX * 100}%`);
        island.style.setProperty("--glass-pointer-y", `${pointerY * 100}%`);
      });
    },
    [tracksPointer],
  );

  const resetGlassPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!tracksPointer) {
        return;
      }

      if (glassFrameRef.current !== null) {
        window.cancelAnimationFrame(glassFrameRef.current);
        glassFrameRef.current = null;
      }

      event.currentTarget.style.setProperty("--glass-pointer-x", "50%");
      event.currentTarget.style.setProperty("--glass-pointer-y", "18%");
    },
    [tracksPointer],
  );

  return { handleGlassPointerMove, resetGlassPointer };
}
