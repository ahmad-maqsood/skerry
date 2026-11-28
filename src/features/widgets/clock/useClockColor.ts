import { useEffect, useState } from "react";
import { CLOCK_COLOR_KEY, loadClockColor, saveClockColor, type ClockColorSettings } from "./storage";

/** The clock's colour choice. The widget and the settings window are separate windows, so a change arrives through storage. */
export function useClockColor() {
  const [settings, setSettings] = useState(loadClockColor);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CLOCK_COLOR_KEY) setSettings(loadClockColor());
    };
    window.addEventListener("storage", onStorage);
    // A change made between the first read and the listener is not missed.
    setSettings(loadClockColor());
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (next: ClockColorSettings) => {
    saveClockColor(next);
    setSettings(next);
  };

  return { settings, update };
}
