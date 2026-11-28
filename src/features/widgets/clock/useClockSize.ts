import { useEffect, useState } from "react";
import { CLOCK_SIZE_KEY, loadClockWidth, saveClockWidth } from "./storage";

/** The clock's width in pixels. The widget and the settings window are separate windows, so a change arrives through storage. */
export function useClockSize() {
  const [width, setWidth] = useState(loadClockWidth);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CLOCK_SIZE_KEY) setWidth(loadClockWidth());
    };
    window.addEventListener("storage", onStorage);
    // A change made between the first read and the listener is not missed.
    setWidth(loadClockWidth());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: number) => {
    saveClockWidth(next);
    setWidth(loadClockWidth());
  };

  return { width, update };
}
