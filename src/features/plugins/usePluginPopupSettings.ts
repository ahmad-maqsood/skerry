import { useCallback, useEffect, useState } from "react";
import { withPluginPopup } from "./pluginPopups.ts";
import { loadPopupsOff, PLUGIN_POPUPS_OFF_KEY, savePopupsOff } from "./storage.ts";

/**
 * Which plugins may pop up on the island. The settings window writes the choice and the island reads
 * it: the `storage` event carries a change from one window to the other.
 */
export function usePluginPopupSettings() {
  const [off, setOff] = useState(loadPopupsOff);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key === PLUGIN_POPUPS_OFF_KEY) setOff(loadPopupsOff());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const setPopup = useCallback((pluginId: string, on: boolean) => {
    setOff((current) => {
      const next = withPluginPopup(current, pluginId, on);
      savePopupsOff(next);
      return next;
    });
  }, []);
  return { off, isOn: (pluginId: string) => !off.includes(pluginId), setPopup };
}
