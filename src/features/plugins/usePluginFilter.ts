import { useCallback, useMemo, useState } from "react";
import { activePluginFilter, filterFeed, offersPluginFilter, pluginsInFeed, type FilterPlugin } from "./pluginFilter.ts";
import type { PluginFeedController } from "./usePluginFeed.ts";
import { loadPluginFilter, savePluginFilter } from "./storage.ts";

export type PluginFilterController = {
  /** Plugins to pick from; the filter is shown only when `offered`. */
  plugins: FilterPlugin[];
  offered: boolean;
  /** The plugin on show; null for all of them. While the filter is not offered it is always null. */
  selected: string | null;
  select: (pluginId: string | null) => void;
  /** The feed to show, with the controller's actions: Clear all and counts follow what is on show. */
  feed: PluginFeedController;
};

/**
 * Narrows the plugins' feed to one plugin. The choice is remembered, but a saved plugin that no longer
 * has anything to show (or is the only one left) is ignored, so the list is never hidden by a control
 * that cannot be reached.
 */
export function usePluginFilter(feed: PluginFeedController): PluginFilterController {
  const [chosen, setChosen] = useState(loadPluginFilter);
  const { notifications, sessions } = feed;
  const plugins = useMemo(() => pluginsInFeed({ notifications, sessions }), [notifications, sessions]);
  const offered = offersPluginFilter(plugins);
  const selected = offered ? activePluginFilter(chosen, plugins) : null;
  const select = useCallback((pluginId: string | null) => {
    setChosen(pluginId);
    savePluginFilter(pluginId);
  }, []);
  const shownItems = useMemo(() => filterFeed({ notifications, sessions }, selected), [notifications, sessions, selected]);
  const shown = { ...feed, ...shownItems };
  return { plugins, offered, selected, select, feed: shown };
}
