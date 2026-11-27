import { useCallback, useEffect, useState } from "react";
import type { IslandSettings } from "../../features/appearance/types";
import { getForegroundFullscreen, listenForegroundFullscreen, listenIslandHover } from "./api";
import { idlePlan } from "./idleCollapse";
import { keepIslandVisible, keepVisibleChangesAt } from "./keepVisible";
import { MESSAGE_PEEK_RETRACT_MS, messagePeekSettles, retractsPeek, revealsForKeepVisible } from "./tuckRules";
import { useIdleTuck, useRevealOnMessage } from "./useIslandAutomation";
import { isEditingText } from "./useHoverExpand";
import type { useIslandNavigation } from "./useIslandNavigation";
import { useTuckPeek } from "./useTuckPeek";
import { isIslandPickerOpen, useIslandPickerOpen } from "../../lib/islandPicker";

type IslandTuckingOptions = {
  settings: IslandSettings;
  navigation: ReturnType<typeof useIslandNavigation>;
  hasMessagePreview: boolean;
  /** What "Stay visible while…" looks at (keepVisible.ts). */
  activity: Parameters<typeof keepIslandVisible>[1];
  /** Game mode holds the island back or tucked it; keep-visible does not undo that. */
  gameHolds: boolean;
};

/**
 * Collapsing the open island once the cursor has been away long enough (A), tucking the
 * collapsed island away when idle (B), sliding it out for what needs to be seen, and ending a peek.
 */
export function useIslandTucking({ settings, navigation, hasMessagePreview, activity, gameHolds }: IslandTuckingOptions) {
  const { mode, page, isTucked, isPeeking, peekRetractDelayMs, tuckedAutomatically, messagePeek, settleMessagePeek, idleTuck, collapseIsland, revealIsland, revealForMessage, endPeek } = navigation;
  const isHovering = useIslandHovering();
  const pickerOpen = useIslandPickerOpen();
  const keepForActivity = useKeepVisible(settings, activity);
  // Only worth watching while the island could idle-tuck at all.
  const onDesktop = useDesktopInFront(settings.alwaysShowOnDesktop && settings.autoTuck && !settings.alwaysShowIsland);
  const keepVisible = keepForActivity || onDesktop;
  const tuckState = {
    isTucked, isPeeking, tuckedAutomatically, keepVisible, hasMessagePreview, isPreviewing: navigation.isPreviewing, gameHolds,
  };
  const settlesMessagePeek = messagePeekSettles({ ...tuckState, messagePeek, isHovering });
  useEffect(() => {
    if (settlesMessagePeek) settleMessagePeek();
  }, [settlesMessagePeek, settleMessagePeek]);
  const revealForActivity = revealsForKeepVisible(tuckState);
  useEffect(() => {
    if (revealForActivity) revealIsland();
  }, [revealForActivity, revealIsland]);
  // A showing preview holds the idle timer, which then restarts in full once it ends.
  const tuckWhenIdle = useCallback(
    () => idleTuck(settings.autoTuckRetract ? settings.autoTuckRetractDelayMs : null),
    [idleTuck, settings.autoTuckRetract, settings.autoTuckRetractDelayMs],
  );
  // Closing under a draft would lose it; the next keystroke or move starts the wait again.
  const collapseWhenIdle = useCallback(() => {
    if (!isEditingText() && !isIslandPickerOpen()) collapseIsland();
  }, [collapseIsland]);
  const plan = navigation.isPreviewing || pickerOpen ? null : idlePlan(mode, settings, hasMessagePreview, isHovering, keepVisible);
  useIdleTuck(
    plan !== null,
    plan?.seconds ?? 0,
    isTucked,
    `${mode}:${page}`,
    plan?.action === "collapse" ? collapseWhenIdle : tuckWhenIdle,
  );
  useRevealOnMessage(hasMessagePreview, isTucked, revealForMessage);
  // A preview holds the peek; the island slides back once it has gone and the cursor is away.
  useTuckPeek(retractsPeek(tuckState), endPeek, messagePeek ? MESSAGE_PEEK_RETRACT_MS : peekRetractDelayMs ?? undefined);
}

/** Whether the Windows desktop is in front, from the native foreground check; false while not watching. */
function useDesktopInFront(watching: boolean) {
  const [onDesktop, setOnDesktop] = useState(false);
  useEffect(() => {
    if (!watching) return;
    let didCancel = false;
    let unlisten: (() => void) | null = null;
    // An event is newer than the first read, which may resolve after it.
    let heard = false;
    const failed = (error: unknown) => console.error("Failed to watch for the desktop", error);
    void listenForegroundFullscreen((state) => { heard = true; setOnDesktop(state.onDesktop); })
      .then((next) => {
        if (didCancel) next();
        else unlisten = next;
      })
      .catch(failed);
    void getForegroundFullscreen()
      .then((state) => { if (!didCancel && !heard) setOnDesktop(state?.onDesktop === true); })
      .catch(failed);
    return () => {
      didCancel = true;
      unlisten?.();
    };
  }, [watching]);
  return watching && onDesktop;
}

/**
 * Whether "Stay visible while…" holds the island now. Re-checked when a todo timer that holds it
 * runs out, which nothing else re-renders for: the island used to stay out after the timer ended.
 */
function useKeepVisible(settings: IslandSettings, activity: IslandTuckingOptions["activity"]) {
  const [, rerender] = useState(0);
  const now = Date.now();
  const changesAt = keepVisibleChangesAt(settings, activity, now);
  useEffect(() => {
    if (changesAt === null) return;
    const timer = window.setTimeout(() => rerender((count) => count + 1), Math.max(0, changesAt - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [changesAt]);
  return keepIslandVisible(settings, activity, now);
}

/** Whether the cursor is over the island, from the native hover events. */
function useIslandHovering() {
  const [isHovering, setIsHovering] = useState(false);
  useEffect(() => {
    let didCancel = false;
    let unlisten: (() => void) | null = null;
    void listenIslandHover(setIsHovering)
      .then((next) => {
        if (didCancel) next();
        else unlisten = next;
      })
      .catch((error) => console.error("Failed to listen for island hover", error));
    return () => {
      didCancel = true;
      unlisten?.();
    };
  }, []);
  return isHovering;
}
