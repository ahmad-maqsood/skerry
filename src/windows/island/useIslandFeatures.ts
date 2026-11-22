import { useCallback, useEffect, useMemo, useRef } from "react";
import type { IslandSettings } from "../../features/appearance/types";
import { islandPageFor, resolveIslandPage, type IslandFeatures } from "./features";
import type { IslandPage } from "./types";

type IslandFeatureOptions = {
  settings: IslandSettings;
  clipboardEnabled: boolean;
  systemNotificationsEnabled: boolean;
  page: IslandPage;
  setPage: (page: IslandPage) => void;
  openIslandPage: (page: IslandPage) => void;
};

/**
 * The modules switched on, and the island kept consistent with them.
 */
export function useIslandFeatures({
  settings,
  clipboardEnabled,
  systemNotificationsEnabled,
  page,
  setPage,
  openIslandPage,
}: IslandFeatureOptions) {
  const features = useMemo<IslandFeatures>(
    () => ({
      todo: settings.todoEnabled,
      music: settings.musicEnabled,
      clipboard: clipboardEnabled,
      shelf: settings.shelfEnabled,
      qq: systemNotificationsEnabled,
      translation: settings.translationEnabled && settings.translationTarget === "island",
      system: settings.systemMonitorEnabled,
    }),
    [
      clipboardEnabled,
      settings.musicEnabled,
      settings.shelfEnabled,
      settings.systemMonitorEnabled,
      settings.todoEnabled,
      settings.translationEnabled,
      settings.translationTarget,
      systemNotificationsEnabled,
    ],
  );

  useEffect(() => {
    const next = islandPageFor(page, features, settings.clipboardDetached);
    if (next && next !== page) setPage(next);
  }, [features, page, setPage, settings.clipboardDetached]);

  const featuresRef = useRef(features);
  featuresRef.current = features;

  const navigateToPage = useCallback(
    (requested: IslandPage) => {
      const target = resolveIslandPage(requested, featuresRef.current);
      if (target) openIslandPage(target);
    },
    [openIslandPage],
  );

  return { features, navigateToPage };
}
