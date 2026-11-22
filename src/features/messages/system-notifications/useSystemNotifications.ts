import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  clearSystemNotifications,
  dismissSystemNotification,
  dismissSystemNotificationApp,
  listenSystemNotificationsChanged,
  openNotificationApp,
  openSystemNotificationSettings,
  requestSystemNotificationAccess,
  setAppMuted,
  setHideNotificationText,
  setSystemNotificationsEnabled,
} from "./api";
import {
  getMutedApps,
  hasRequestedNotificationAccess,
  isHideNotificationText,
  isSystemNotificationsEnabled,
  markNotificationAccessRequested,
  saveHideNotificationText,
  saveMutedApps,
  saveSystemNotificationsEnabled,
} from "./storage";
import type { SystemNotificationSnapshot } from "./types";

export type SystemNotificationPreview = {
  id: string;
  appId: string;
  appDisplayName: string;
  title: string;
  body: string;
  timestamp: number;
  appLogo?: string | null;
  receivedAt: number;
};

const EMPTY_SNAPSHOT: SystemNotificationSnapshot = {
  revision: 0,
  enabled: false,
  status: "disabled",
  items: [],
  knownApps: [],
  mutedApps: [],
  hideText: false,
  error: null,
};

export type SystemNotificationsController = {
  snapshot: SystemNotificationSnapshot;
  preview: SystemNotificationPreview | null;
  previewReceivedAt: number | null;
  busy: boolean;
  actionError: string | null;
  setEnabled: (enabled: boolean) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissOne: (id: string) => Promise<void>;
  dismissApp: (appId: string) => Promise<void>;
  toggleAppMuted: (appId: string) => Promise<void>;
  toggleHideText: (hide: boolean) => Promise<void>;
  openApp: (appId: string) => Promise<void>;
  requestAccess: () => Promise<string>;
  openSettings: (access: boolean) => Promise<void>;
};

export function useSystemNotifications(
  canPreview = true,
  previewSeconds = 5,
): SystemNotificationsController {
  const [snapshot, setSnapshot] = useState<SystemNotificationSnapshot>(EMPTY_SNAPSHOT);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(isTauri);
  const [preview, setPreview] = useState<SystemNotificationPreview | null>(null);

  const canPreviewRef = useRef(canPreview);
  const previewSecondsRef = useRef(previewSeconds);
  const revisionRef = useRef(-1);

  useLayoutEffect(() => {
    previewSecondsRef.current = previewSeconds;
  }, [previewSeconds]);

  useLayoutEffect(() => {
    canPreviewRef.current = canPreview;
    if (!canPreview) {
      setPreview(null);
    }
  }, [canPreview]);

  const acceptSnapshot = useCallback((next: SystemNotificationSnapshot) => {
    if (next.revision < revisionRef.current) return false;
    revisionRef.current = next.revision;
    setSnapshot(next);
    return true;
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      unlisten = await listenSystemNotificationsChanged(({ payload }) => {
        if (cancelled || !acceptSnapshot(payload.snapshot)) return;

        if (!payload.snapshot.enabled || !payload.windowVisible || !canPreviewRef.current) {
          setPreview(null);
          return;
        }

        if (payload.newestId) {
          const item = payload.snapshot.items.find((it) => it.id === payload.newestId);
          if (item) {
            setPreview({
              id: item.id,
              appId: item.appId,
              appDisplayName: item.appDisplayName,
              title: item.title,
              body: item.body,
              timestamp: item.timestamp,
              appLogo: item.appLogo,
              receivedAt: Date.now(),
            });
          }
        }
      });

      if (cancelled) {
        unlisten();
        return;
      }

      // Initialize backend state from storage
      const initialEnabled = isSystemNotificationsEnabled();
      const initialMuted = getMutedApps();
      const initialHideText = isHideNotificationText();

      const next = await setSystemNotificationsEnabled(initialEnabled);
      if (!cancelled) {
        acceptSnapshot(next);
        for (const appId of initialMuted) {
          await setAppMuted(appId, true);
        }
        if (initialHideText) {
          await setHideNotificationText(true);
        }
      }

      if (!cancelled && next.enabled && !hasRequestedNotificationAccess()) {
        markNotificationAccessRequested();
        await requestSystemNotificationAccess();
      }
    })()
      .catch((error: unknown) => {
        if (!cancelled) setActionError(String(error));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [acceptSnapshot]);

  // Handle preview expiration
  useEffect(() => {
    if (!preview) return;
    const durationMs = Math.max(1000, previewSecondsRef.current * 1000);
    const timer = window.setTimeout(() => setPreview(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [preview]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      saveSystemNotificationsEnabled(enabled);
      if (!isTauri()) return;
      try {
        const next = await setSystemNotificationsEnabled(enabled);
        acceptSnapshot(next);
      } catch (error) {
        setActionError(String(error));
      }
    },
    [acceptSnapshot],
  );

  const clearAll = useCallback(async () => {
    setPreview(null);
    if (!isTauri()) {
      setSnapshot((prev) => ({ ...prev, items: [] }));
      return;
    }
    try {
      const next = await clearSystemNotifications();
      acceptSnapshot(next);
    } catch (error) {
      setActionError(String(error));
    }
  }, [acceptSnapshot]);

  const dismissOne = useCallback(
    async (id: string) => {
      if (preview?.id === id) setPreview(null);
      if (!isTauri()) {
        setSnapshot((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));
        return;
      }
      try {
        const next = await dismissSystemNotification(id);
        acceptSnapshot(next);
      } catch (error) {
        setActionError(String(error));
      }
    },
    [acceptSnapshot, preview],
  );

  const dismissApp = useCallback(
    async (appId: string) => {
      if (preview?.appId.toLowerCase() === appId.toLowerCase()) setPreview(null);
      if (!isTauri()) {
        setSnapshot((prev) => ({
          ...prev,
          items: prev.items.filter((it) => it.appId.toLowerCase() !== appId.toLowerCase()),
        }));
        return;
      }
      try {
        const next = await dismissSystemNotificationApp(appId);
        acceptSnapshot(next);
      } catch (error) {
        setActionError(String(error));
      }
    },
    [acceptSnapshot, preview],
  );

  const toggleAppMuted = useCallback(
    async (appId: string) => {
      const isMuted = snapshot.mutedApps.some((m) => m.toLowerCase() === appId.toLowerCase());
      const nextMuted = isMuted
        ? snapshot.mutedApps.filter((m) => m.toLowerCase() !== appId.toLowerCase())
        : [...snapshot.mutedApps, appId];
      saveMutedApps(nextMuted);

      if (!isTauri()) {
        setSnapshot((prev) => ({ ...prev, mutedApps: nextMuted }));
        return;
      }
      try {
        const next = await setAppMuted(appId, !isMuted);
        acceptSnapshot(next);
      } catch (error) {
        setActionError(String(error));
      }
    },
    [acceptSnapshot, snapshot.mutedApps],
  );

  const toggleHideText = useCallback(
    async (hide: boolean) => {
      saveHideNotificationText(hide);
      if (!isTauri()) {
        setSnapshot((prev) => ({ ...prev, hideText: hide }));
        return;
      }
      try {
        const next = await setHideNotificationText(hide);
        acceptSnapshot(next);
      } catch (error) {
        setActionError(String(error));
      }
    },
    [acceptSnapshot],
  );

  const openApp = useCallback(async (appId: string) => {
    if (!isTauri()) return;
    try {
      await openNotificationApp(appId);
    } catch {
      // Fall back silently
    }
  }, []);

  const requestAccess = useCallback(async () => {
    if (!isTauri()) return "allowed";
    return requestSystemNotificationAccess();
  }, []);

  const openSettings = useCallback(async (access: boolean) => {
    if (!isTauri()) return;
    return openSystemNotificationSettings(access);
  }, []);

  return {
    snapshot,
    preview,
    previewReceivedAt: preview?.receivedAt ?? null,
    busy,
    actionError,
    setEnabled,
    clearAll,
    dismissOne,
    dismissApp,
    toggleAppMuted,
    toggleHideText,
    openApp,
    requestAccess,
    openSettings,
  };
}
