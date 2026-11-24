import { useCallback, useEffect, useMemo } from "react";
import { visibleCollapsedSlots } from "../../features/appearance/collapsedLayout";
// First: the message panels it loads bring CSS that must come before the page panels' and the shell's.
import { useIslandNotices } from "./useIslandNotices";
import { useIslandPopups } from "./useIslandPopups";
// The page panels; before IslandShell so their CSS keeps its place in the cascade.
import { IslandPages } from "./IslandPages";
import { useSettingsPresentation } from "../settings/useSettingsPresentation";
import { useSettingsNavigation } from "./useSettingsNavigation";
import { useIslandSettings } from "../../features/appearance/useIslandSettings";
import { useDocumentTheme } from "../../features/appearance/useDocumentTheme";
import { resolveSchemeColors } from "../../features/appearance/theme";
import { useClipboardHistory } from "../../features/clipboard/useClipboardHistory";
// Imported after the page panels so its CSS keeps its place in the cascade.
import { IslandShell } from "./IslandShell";
import { useMediaState } from "../../features/media/useMediaState";
import type { TodoItem } from "../../features/todos/types";
import { useIslandWindow } from "./useIslandWindow";
import { getExpandedIslandHeight } from "./expandedHeight";
import { getIslandStageStyle } from "./stageStyle";
import { shapedSettings } from "../../features/appearance/islandShape";
import { useCollapsedTodo } from "./useCollapsedTodo";
import { useMessageNotice } from "./useMessageNotice";
import { useGameMode } from "./useGameMode";
import { useIslandKeyboard } from "./useIslandKeyboard";
import { useCtrlWheelPages, wheelPageOrder } from "./useCtrlWheelPages";
import { useIslandFeatures } from "./useIslandFeatures";
import { useIslandNavigation } from "./useIslandNavigation";
import { useIslandTodos } from "./useIslandTodos";
import { useIslandTucking } from "./useIslandTucking";
import { useIslandShelf } from "./useIslandShelf";
import { useIslandHover } from "./useIslandHover";
import { useIdleUpdateInstall } from "../../features/updater/useIdleUpdateInstall";
import { useIslandTranslation } from "./useIslandTranslation";
import { warmQuickControls } from "../../features/quick-controls";
import { useSettingsPageHeight } from "./useSettingsPageHeight";
import { useIslandPickerOpen } from "../../lib/islandPicker";
import { TODO_DATE_PICKER_EXPANDED_ISLAND_HEIGHT } from "./layout";
// Must stay the last import: IslandApp.css overrides the feature styles above.
import "./IslandApp.css";

// Stands in for the todo list while todos are switched off, so the collapsed island shows none.
const NO_TODOS: TodoItem[] = [];

/**
 * The island window: puts the feature hooks together and hands their state to the shell and the
 * page panels. Each concern's wiring lives in its own use* hook next to this file; add new wiring
 * there rather than here, so parallel changes do not all meet in this file.
 */
export function IslandApp() {
  const navigation = useIslandNavigation();
  // The brightness read is slow (PowerShell): read it once the island has settled in, so the System
  // page's sliders are already there when it first opens.
  useEffect(() => {
    const timer = window.setTimeout(() => void warmQuickControls(), 1500);
    return () => window.clearTimeout(timer);
  }, []);
  const { mode, isTucked, messagePeek, page, setPage, collapseIsland, tuckIsland, revealIsland, minimizeToEdge, openIslandPage, toggleClipboardHistory } = navigation;
  const [settings, setSettings] = useIslandSettings();
  const detachedSettings = useSettingsPresentation();
  const { openSettings, changePresentation } = useSettingsNavigation(openIslandPage, setPage);
  const { settingsContentHeight, reportSettingsHeight } = useSettingsPageHeight();
  // Quiet while a full-screen app (usually a game) is in front, if game mode asks for it.
  const game = useGameMode(settings, { mode, isTucked, collapseIsland, tuckIsland, revealIsland });
  const notices = useIslandNotices(settings, { mode, isTucked, quiet: game.quiet });
  useIdleUpdateInstall(mode === "collapsed", game.quiet);
  const { systemNotifications, preview, hasMessagePreview, dismissPreview, canPreviewMessages } = notices;
  // The output level shows only on the collapsed island (its waveform).
  const media = useMediaState(settings.musicEnabled, mode === "collapsed");
  const { todos, activeTodoId, activeTodoIds, timer, timers, todoPageMode, todoListHeight, notesExpanded, notebookProps } = useIslandTodos({ settings, navigation, quiet: game.quiet });

  const songPlaying = settings.musicEnabled && media.mediaState.playbackStatus === "playing" && Boolean(media.mediaState.title);
  const cover = settings.collapsedShowCover && songPlaying ? media.mediaState.thumbnail : null;
  const { collapsedTaskTitle, collapsedTodoCount, collapsedItem, collapsedIslandWidth, todoRotation, collapsedTimer } =
    useCollapsedTodo(
      settings.todoEnabled ? todos : NO_TODOS,
      settings.todoEnabled ? activeTodoId : null,
      settings.todoEnabled ? settings : { ...settings, showIdleTodoCount: false },
      mode !== "collapsed" || isTucked || !settings.showCollapsedText || hasMessagePreview,
      { lyricsPlaying: songPlaying, coverWanted: Boolean(cover), timer: settings.todoEnabled ? timer : null,
        activeIds: settings.todoEnabled ? activeTodoIds : [], timers: settings.todoEnabled ? timers : [] },
    );
  // The cover goes with the lyric line: when something ranked above lyrics is shown, it goes too.
  const collapsedCover = collapsedItem === "lyrics" ? cover : null;
  const notice = useMessageNotice(preview, settings, { mode, isTucked, quiet: game.quiet, collapsedIslandWidth });
  useIslandTucking({
    settings,
    navigation,
    hasMessagePreview,
    activity: { collapsedItem, songPlaying, activeTodoId, timer },
    gameHolds: game.quiet || game.tuck,
  });

  const openMessages = useCallback(() => openIslandPage("qq"), [openIslandPage]);

  const clipboard = useClipboardHistory(toggleClipboardHistory);
  const { clipboardHistory } = clipboard;
  // A copied text and a new song pop out like a notification.
  useIslandPopups({
    settings,
    showPreview: systemNotifications.showPreview,
    canPreview: canPreviewMessages,
    clipboardHistory,
    ownCopyAtRef: clipboard.ownCopyAtRef,
    mediaState: media.mediaState,
  });

  const { features, navigateToPage: openEnabledPage } = useIslandFeatures({
    settings,
    clipboardEnabled: clipboardHistory.settings.enabled,
    systemNotificationsEnabled: systemNotifications.snapshot.enabled,
    page,
    setPage,
    openIslandPage,
  });
  // The island pages in the header's order; expanding the island always opens the first of them.
  const tabOrder = useMemo(
    () => wheelPageOrder(settings.pageOrder, features, settings.clipboardDetached),
    [features, settings.clipboardDetached, settings.pageOrder],
  );
  const expandIsland = useCallback(() => openEnabledPage(tabOrder[0] ?? page), [openEnabledPage, page, tabOrder]);
  const { fileShelf, isShelfDropping } = useIslandShelf(settings, navigation);
  const pickerOpen = useIslandPickerOpen();
  const expandedIslandHeight = Math.max(pickerOpen && page === "todo" ? TODO_DATE_PICKER_EXPANDED_ISLAND_HEIGHT : 0, getExpandedIslandHeight({
    page,
    todoPageMode,
    todos,
    todoListHeight,
    hasMediaCommandError: Boolean(media.mediaCommandError),
    maxPanelHeight: settings.maxPanelHeight,
    clipboardVisibleRows: settings.clipboardVisibleRows,
    todoVisibleRows: settings.todoVisibleRows,
    settingsContentHeight,
    shelfItems: fileShelf.items.length,
    notesExpanded,
  }));
  const scheme = useDocumentTheme(settings);
  const colors = useMemo(() => resolveSchemeColors(settings, scheme), [settings, scheme]);
  const stageStyle = useMemo(
    () => getIslandStageStyle(shapedSettings(settings), colors, notice.size?.width ?? collapsedIslandWidth, expandedIslandHeight, notice.size?.height),
    [collapsedIslandWidth, colors, expandedIslandHeight, settings, notice.size],
  );


  const {
    isPositionDetached,
    nativeGlassState,
    minimizeIsland,
    startIslandDrag,
    resetIslandPosition,
  } = useIslandWindow({
    mode,
    isTucked,
    settings,
    setSettings,
    expandedIslandHeight,
    collapsedIslandWidth,
    notice: notice.nativeNotice,
    onCollapse: collapseIsland,
  });

  // Minimizing also sends away a pop-up showing (a copy, a song): it would slide the island back out.
  const minimizeAndDismiss = useCallback(() => {
    dismissPreview();
    if (settings.minimizeAction === "tray") minimizeIsland(); else minimizeToEdge();
  }, [dismissPreview, minimizeIsland, minimizeToEdge, settings.minimizeAction]);

  const hoverTucked = useIslandHover({
    settings,
    navigation,
    quiet: game.quiet,
    hasMessagePreview,
    expandIsland,
  });

  useIslandKeyboard(
    clipboardHistory.settings.enabled && clipboardHistory.settings.shortcutEnabled,
    clipboardHistory.settings.shortcut,
    toggleClipboardHistory,
    collapseIsland,
  );

  useCtrlWheelPages({
    enabled: settings.ctrlWheelPages,
    mode,
    page,
    pages: tabOrder,
    onPageChange: setPage,
  });

  const { openTranslator } = useIslandTranslation(
    settings.translationEnabled,
    features.translation,
    mode,
    page,
    openIslandPage,
    collapseIsland,
  );

  return (
    <main className={`stage stage--font-${settings.fontFamily}`} data-tone={colors.tone} style={stageStyle}>
      <IslandShell
        systemNotifications={systemNotifications}
        onOpenMessages={openMessages}
        preview={preview}
        notice={notice.size}
        mode={mode}
        page={page}
        expandedHeight={expandedIslandHeight}
        material={settings.material}
        nativeGlassState={nativeGlassState}
        isTucked={isTucked}
        peekedForMessage={messagePeek}
        tuckStyle={settings.tuckStyle}
        topEdgeShoulders={settings.topEdgeShoulders}
        positionLocked={settings.positionLocked}
        isDetached={isPositionDetached || settings.marginY > 0}
        islandShape={settings.islandShape}
        showTitle={settings.showTitle}
        showCollapsedText={settings.showCollapsedText}
        collapsedTaskTitle={collapsedTaskTitle}
        todoRotation={todoRotation}
        todoTimer={settings.todoEnabled ? collapsedTimer : null}
        collapsedTodoCount={collapsedTodoCount}
        collapsedItem={collapsedItem}
        collapsedLayout={visibleCollapsedSlots(settings.collapsedLayout, settings.collapsedHidden)}
        collapsedCover={collapsedCover}
        lyricsSettings={settings}
        pageOrder={settings.pageOrder}
        pageButtonStyle={settings.pageButtonStyle}
        onPageOrderChange={(pageOrder) => setSettings({ ...settings, pageOrder })}
        mediaState={media.mediaState}
        features={features}
        shelfCount={settings.shelfEnabled && settings.shelfShowCount ? fileShelf.items.length : null}
        onOpenPage={openEnabledPage}
        onExpand={expandIsland}
        onWindowDragStart={startIslandDrag}
        onCollapse={collapseIsland}
        onResetPosition={resetIslandPosition}
        minimizesToTray={settings.minimizeAction === "tray"}
        onMinimize={minimizeAndDismiss}
        onOpenTranslator={settings.translationEnabled ? openTranslator : null}
        onOpenSettings={openSettings}
        onReveal={hoverTucked}
        onPageChange={setPage}
      >
        <IslandPages
          page={page}
          mode={mode}
          settings={settings}
          onSettingsChange={setSettings}
          detachedSettings={detachedSettings}
          onDetachedSettingsChange={(value) => void changePresentation(value)}
          onSettingsHeight={reportSettingsHeight}
          features={features}
          systemNotifications={systemNotifications}
          media={media}
          clipboard={clipboard}
          fileShelf={fileShelf}
          isShelfDropping={isShelfDropping}
          notebookProps={notebookProps}
        />
      </IslandShell>
    </main>
  );
}
