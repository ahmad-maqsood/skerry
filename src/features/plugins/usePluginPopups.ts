import { useEffect, useRef } from "react";
import { buildFeed, type FeedNotification } from "./pluginFeed.ts";
import { nextPluginPopup } from "./pluginPopups.ts";
import { usePluginPopupSettings } from "./usePluginPopupSettings.ts";
import { usePlugins } from "./usePlugins.ts";

/**
 * Calls `announce` when an enabled plugin publishes a notification that is new since the island
 * started, unless that plugin's pop-ups are off. What `announce` shows is up to the caller.
 */
export function usePluginPopups(announce: (item: FeedNotification) => void) {
  const snapshot = usePlugins();
  const { off } = usePluginPopupSettings();
  // Notifications already looked at, and when this began: older ones are not news.
  const seenRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(Date.now());
  const announceRef = useRef(announce);
  useEffect(() => {
    announceRef.current = announce;
  });
  useEffect(() => {
    const { notifications } = buildFeed(snapshot, new Set());
    const { popup, seen } = nextPluginPopup(seenRef.current, notifications, new Set(off), startedAtRef.current);
    seenRef.current = seen;
    if (popup) announceRef.current(popup);
  }, [snapshot, off]);
}
