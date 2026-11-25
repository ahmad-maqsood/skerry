import type { ReactNode } from "react";
import { MessagesPanel } from "../../features/messages/Messages";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { TodoNotebook } from "../../features/todos/TodoNotebook";
import type { useTodos } from "../../features/todos/useTodos";
import { openSettingsWindow } from "../settings/api";
import { SettingsPanel } from "../settings/SettingsPanel";
import "../settings/IslandSettingsPage.css";
import { TranslationPanel } from "../../features/translation/TranslationPanel";
import { usePluginFeed } from "../../features/plugins";
import { PluginMessagesSection } from "./PluginMessagesSection";
import type { IslandSettings } from "../../features/appearance/types";
import { ClipboardHistoryPanel } from "../../features/clipboard/ClipboardHistoryPanel";
import type { useClipboardHistory } from "../../features/clipboard/useClipboardHistory";
import { MusicPlayerPanel } from "../../features/media/MusicPlayerPanel";
import type { useMediaState } from "../../features/media/useMediaState";
import { FileShelfPanel } from "../../features/file-shelf/FileShelfPanel";
import type { useFileShelf } from "../../features/file-shelf/useFileShelf";
import { SystemPanel } from "../../features/system-monitor/SystemPanel.tsx";
import { getTodoScrollStartRows } from "./layout";
import type { useIslandFeatures } from "./useIslandFeatures";
import type { useIslandNavigation } from "./useIslandNavigation";

type IslandPagesProps = {
  page: ReturnType<typeof useIslandNavigation>["page"];
  mode: ReturnType<typeof useIslandNavigation>["mode"];
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings | ((current: IslandSettings) => IslandSettings)) => void;
  /** Whether settings open in their own window (then this page is not used). */
  detachedSettings: boolean;
  onDetachedSettingsChange: (detached: boolean) => void;
  /** The height the open settings page needs (useSettingsPageHeight). */
  onSettingsHeight: (height: number) => void;
  features: ReturnType<typeof useIslandFeatures>["features"];
  systemNotifications: SystemNotificationsController;
  media: ReturnType<typeof useMediaState>;
  clipboard: ReturnType<typeof useClipboardHistory>;
  fileShelf: ReturnType<typeof useFileShelf>;
  isShelfDropping: boolean;
  notebookProps: ReturnType<typeof useTodos>["notebookProps"];
};

/** The expanded island's page panels; the one for `page` shows. */
export function IslandPages({
  page,
  mode,
  settings,
  onSettingsChange,
  detachedSettings,
  onDetachedSettingsChange,
  onSettingsHeight,
  systemNotifications,
  media,
  clipboard,
  fileShelf,
  isShelfDropping,
  notebookProps,
}: IslandPagesProps): ReactNode {
  const pluginFeed = usePluginFeed();
  const { mediaState, isMediaTrackChanging, mediaCommandError, runMediaCommand, seekTo, calibrate } = media;
  const {
    clipboardHistory,
    copyClipboardHistoryItem,
    toggleClipboardHistoryFavorite,
    updateClipboardHistoryItemNote,
    deleteClipboardHistoryItem,
    deleteClipboardHistoryItems,
  } = clipboard;
  return (
    <>
      {page === "settings" && (
        <div className="island-settings">
          <SettingsPanel
            settings={settings}
            onSettingsChange={onSettingsChange}
            systemNotifications={systemNotifications}
            detached={detachedSettings}
            onDetachedChange={onDetachedSettingsChange}
            onContentHeight={onSettingsHeight}
          />
        </div>
      )}
      {page === "qq" && (
        <div className="message-panel">
          <MessagesPanel
            controller={systemNotifications}
            extra={{
              count: pluginFeed.notifications.length,
              hasContent: pluginFeed.notifications.length + pluginFeed.sessions.length > 0,
              node: <PluginMessagesSection feed={pluginFeed} />,
              onClear: () => pluginFeed.dismissAll(pluginFeed.notifications),
            }}
          />
        </div>
      )}
      {page === "music" && (
        <MusicPlayerPanel
          mediaState={mediaState}
          isTrackChanging={isMediaTrackChanging}
          commandError={mediaCommandError}
          onOpenSettings={() => openSettingsWindow("music")}
          onPlayPause={() => void runMediaCommand("media_play_pause")}
          onNext={() => void runMediaCommand("media_next")}
          onPrevious={() => void runMediaCommand("media_previous")}
          onSeek={(positionMs) => void seekTo(positionMs)}
          onCalibrate={calibrate}
          lyricsSettings={settings}
        />
      )}
      {page === "clipboard" && (
        <ClipboardHistoryPanel
          snapshot={clipboardHistory}
          onCopyItem={copyClipboardHistoryItem}
          onToggleFavorite={(id) => void toggleClipboardHistoryFavorite(id)}
          onUpdateNote={updateClipboardHistoryItemNote}
          onDeleteItem={(id) => void deleteClipboardHistoryItem(id)}
          onDeleteItems={deleteClipboardHistoryItems}
        />
      )}
      {page === "translation" && <TranslationPanel isOpen={mode === "expanded"} onOpenSettings={() => openSettingsWindow("translation")} />}
      {page === "system" && <SystemPanel />}
      {page === "shelf" && <FileShelfPanel shelf={fileShelf} isDropTarget={isShelfDropping} revealOnDoubleClick={settings.shelfDoubleClick === "reveal"} />}
      {page === "todo" && (
        <TodoNotebook
          {...notebookProps}
          enableTodoReorder={settings.enableTodoReorder}
          scrollStartRows={getTodoScrollStartRows(settings.maxPanelHeight)}
        />
      )}
    </>
  );
}
