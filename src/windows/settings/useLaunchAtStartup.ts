import { useCallback, useEffect, useState } from "react";
import { readLaunchAtStartup, saveLaunchAtStartup } from "./api";

/**
 * Whether Windows will start the app at sign-in. Task Manager can change that at any time, so
 * it is read again whenever the window gets the focus. A change is shown optimistically, then
 * replaced by what Windows reports; `error` says why Windows kept its own setting.
 */
export function useLaunchAtStartup() {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLaunchAtStartup(await readLaunchAtStartup());
    } catch (reason) {
      console.error("Failed to read launch at startup", reason);
    }
  }, []);

  useEffect(() => {
    const onFocus = () => {
      setError(null);
      void refresh();
    };
    onFocus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const updateLaunchAtStartup = useCallback(async (enabled: boolean) => {
    setError(null);
    setLaunchAtStartup(enabled);

    try {
      await saveLaunchAtStartup(enabled);
    } catch (reason) {
      console.error("Failed to update launch at startup", reason);
      setLaunchAtStartup(!enabled);
      setError(String(reason));
    }
    await refresh();
  }, [refresh]);

  return [launchAtStartup, updateLaunchAtStartup, error] as const;
}
