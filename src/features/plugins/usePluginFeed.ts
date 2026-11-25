import { useCallback, useMemo, useState } from "react";
import { openPluginLink } from "./api.ts";
import { addDismissed, buildFeed, dismissKey, type FeedNotification, type PluginFeed } from "./pluginFeed.ts";
import { loadDismissed, saveDismissed } from "./storage.ts";
import { usePlugins } from "./usePlugins.ts";

export type PluginFeedController = PluginFeed & {
  dismiss: (item: FeedNotification) => void;
  dismissAll: (items: readonly FeedNotification[]) => void;
  /** Runs the item's action (for links, opens the page). Does nothing for an item with no action. */
  open: (item: { pluginId: string; action: string | null }) => void;
};

/** The plugins' notifications and sessions for the island, minus the notifications the user cleared. */
export function usePluginFeed(): PluginFeedController {
  const snapshot = usePlugins();
  const [dismissed, setDismissed] = useState(loadDismissed);
  const feed = useMemo(() => buildFeed(snapshot, new Set(dismissed)), [snapshot, dismissed]);

  const dismissAll = useCallback((items: readonly FeedNotification[]) => {
    if (items.length === 0) return;
    setDismissed((current) => {
      const next = addDismissed(current, items.map(dismissKey));
      saveDismissed(next);
      return next;
    });
  }, []);
  const dismiss = useCallback((item: FeedNotification) => dismissAll([item]), [dismissAll]);
  const open = useCallback((item: { pluginId: string; action: string | null }) => {
    if (!item.action) return;
    void openPluginLink(item.pluginId, item.action).catch((error) => console.error("Failed to open plugin link", error));
  }, []);

  return { ...feed, dismiss, dismissAll, open };
}
