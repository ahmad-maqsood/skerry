import { useCallback, useEffect, useState } from "react";
import { loadPrivacySettings, PRIVACY_SETTINGS_KEY, savePrivacySettings, type PrivacySettings } from "./storage.ts";

/** The privacy indicator's settings, kept in step with the other windows through the storage event. */
export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(loadPrivacySettings);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === PRIVACY_SETTINGS_KEY || event.key === null) setSettings(loadPrivacySettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback((changes: Partial<PrivacySettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      savePrivacySettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
