import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSystemSnapshot,
  listenSystemUpdates,
  startSystemSampling,
  stopSystemSampling,
} from "./api.ts";
import { loadSystemSettings, saveSystemSettings, SYSTEM_SETTINGS_KEY } from "./storage.ts";
import type { SystemSettings, SystemSnapshot } from "./types.ts";

const MAX_HISTORY_POINTS = 60;

function appendHistory(prev: number[], nextVal: number): number[] {
  const next = [...prev, nextVal];
  return next.length > MAX_HISTORY_POINTS ? next.slice(next.length - MAX_HISTORY_POINTS) : next;
}

export function useSystemMonitor(active: boolean) {
  const [settings, setSettingsState] = useState<SystemSettings>(loadSystemSettings);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);

  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<number[]>([]);
  const [uploadHistory, setUploadHistory] = useState<number[]>([]);

  // Listen for storage changes from other windows/panels
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SYSTEM_SETTINGS_KEY) {
        setSettingsState(loadSystemSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback(
    (updater: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => {
      setSettingsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        saveSystemSettings(next);
        return next;
      });
    },
    [],
  );

  const shouldSample = active && settings.enabled;
  const interval = settings.refreshIntervalSeconds;

  const handleUpdate = useCallback((next: SystemSnapshot | null) => {
    // No snapshot yet (the native side has nothing, or a preview page has no backend).
    if (!next) return;
    setSnapshot(next);
    setCpuHistory((prev) => appendHistory(prev, next.cpu.totalPercent));
    setMemoryHistory((prev) => appendHistory(prev, next.memory.percent));
    setDownloadHistory((prev) => appendHistory(prev, next.network.rxBytesPerSec));
    setUploadHistory((prev) => appendHistory(prev, next.network.txBytesPerSec));
  }, []);

  const handleUpdateRef = useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;

  useEffect(() => {
    if (!shouldSample) return;

    let unlisten: (() => void) | null = null;
    let cancelled = false;

    // 1. Initial snapshot fetch
    void getSystemSnapshot()
      .then((data) => {
        if (!cancelled) handleUpdateRef.current(data);
      })
      .catch(() => {
        // Ignored; sampling will update shortly
      });

    // 2. Start native sampling
    void startSystemSampling(interval).catch(() => {});

    // 3. Listen for event ticks
    void listenSystemUpdates((event) => {
      if (!cancelled) handleUpdateRef.current(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      void stopSystemSampling().catch(() => {});
    };
  }, [shouldSample, interval]);

  return {
    settings,
    updateSettings,
    snapshot,
    cpuHistory,
    memoryHistory,
    downloadHistory,
    uploadHistory,
  };
}
