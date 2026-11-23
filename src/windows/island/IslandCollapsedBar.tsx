import { Fragment, type ReactNode } from "react";
import { Inbox, Minus } from "lucide-react";
import type { CollapsedItem, CollapsedSlot } from "../../features/appearance/types";
import type { MediaState } from "../../features/media/api";
import { CollapsedLyric } from "../../features/media/CollapsedLyric";
import type { LyricsSettings } from "../../features/media/lyrics/useLyrics";
import { CollapsedMessageContent } from "../../features/messages/CollapsedMessageContent";
import { MessageNoticeReader } from "../../features/messages/MessageNoticeReader";
// After CollapsedMessageContent, matching the original stylesheet order.
import { MusicWaveButton } from "../../features/media/MusicWaveButton";
import type { MessagePreview } from "../../features/messages/messagePreview";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { CollapsedClock, CollapsedWeather, useClockWeather, useCurrentWeather } from "../../features/weather";
import { CollapsedSystemChip } from "../../features/system-monitor/CollapsedSystemChip.tsx";
import { PrivacyIndicator } from "../../features/privacy";
import { useTranslation } from "../../i18n";
import { TodoCountdown } from "../../features/todos/TodoCountdown";
import { useUpdatePending } from "../../features/updater/useUpdatePending";
import { isTodoTimerEndingSoon, type TodoTimer } from "../../features/todos/timer";
import { CollapsedTodoContent, type TodoRotationDisplay } from "./CollapsedTodoContent";
import { isCollapsedFocused, focusedCollapsedSlots } from "./collapsedFocus.ts";
import type { IslandPage } from "./types";
import { useLingeringFlag } from "./useLingeringFlag";
import { useWindowDragGesture } from "./useWindowDragGesture";
import "./IslandCollapsedBar.css";

/** How long a message preview takes to slide out of the text (CollapsedMessageContent's outgoing layer). */
const FOCUS_RELEASE_MS = 720;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type IslandCollapsedBarProps = {
  systemNotifications: SystemNotificationsController;
  preview: MessagePreview | null;
  /** The adaptive preview's reader (sender, then the whole text) in place of the bar, or null. */
  noticeReader?: { scrolls: boolean } | null;
  isExpanded: boolean;
  isTucked: boolean;
  positionLocked: boolean;
  showTitle: boolean;
  showCollapsedText: boolean;
  collapsedLabel: string;
  collapsedTaskTitle: string | null;
  todoTimer?: TodoTimer | null;
  todoRotation?: TodoRotationDisplay | null;
  collapsedTodoCount: number | null;
  /** Which of the lyric line and a todo the text shows (Settings → Appearance), if any. */
  collapsedItem: CollapsedItem | null;
  /** Where the text and each status icon sit, left to right (Settings → Appearance). */
  collapsedLayout: readonly CollapsedSlot[];
  /** The playing song's cover, or null when it is not shown. */
  collapsedCover: string | null;
  lyricsSettings: LyricsSettings & { lyricsOffsetMs: number };
  mediaState: MediaState;
  /** False while music is switched off, which hides the waveform button; it also shows only while a song plays. */
  showMusic: boolean;
  /** Files on the shelf, or null when the count is not shown. */
  shelfCount: number | null;
  onOpenPage: (page: IslandPage) => void;
  /** Opens the island on its first page; a click on the bar itself, not on a button for one page. */
  onExpand: () => void;
  onWindowDragStart: () => void;
  /** False when the minimize button tucks the island to the top edge instead of the tray. */
  minimizesToTray: boolean;
  onMinimize: () => void;
};

/** The collapsed island: status light, todo or message summary, music button and tuck handle. */
export function IslandCollapsedBar({
  systemNotifications,
  preview,
  noticeReader = null,
  isExpanded,
  isTucked,
  positionLocked,
  showTitle,
  showCollapsedText,
  collapsedLabel,
  collapsedTaskTitle,
  todoTimer = null,
  todoRotation = null,
  collapsedTodoCount,
  collapsedItem,
  collapsedLayout,
  collapsedCover,
  lyricsSettings,
  mediaState,
  showMusic,
  shelfCount,
  onOpenPage,
  onExpand,
  onWindowDragStart,
  minimizesToTray,
  onMinimize,
}: IslandCollapsedBarProps) {
  const t = useTranslation();
  const clockWeather = useClockWeather();
  const weatherOn = clockWeather.settings.showWeather && collapsedLayout.includes("weather");
  const weather = useCurrentWeather(weatherOn, clockWeather.settings.location);
  // A pending update shows a red dot even collapsed, so it is not missed.
  const updatePending = useUpdatePending();
  const { didDragRef, prepareWindowDrag, handleWindowDragMove, cancelWindowDrag } =
    useWindowDragGesture(isTucked || positionLocked, onWindowDragStart);
  const isMusicPlaying = mediaState.playbackStatus === "playing";
  const openPreview = (shown: MessagePreview) => {
    // The island's own pop-ups (a copied text, a new song, the charger) open their page, not an app.
    if (shown.kind) onOpenPage(shown.kind === "battery" ? "system" : shown.kind);
    else void systemNotifications.openApp(shown.appId);
  };

  // An alert (notification, new song, reminder) gets the whole bar: only the text and minimize stay.
  // The layout is held until the alert has slid out of the text (FOCUS_RELEASE_MS), so the status
  // icons, the light first on the left, do not pop back in beside text that is still leaving.
  const alerting = !isExpanded && !isTucked && isCollapsedFocused({
    hasPreview: preview !== null,
    todoTimer,
    showsTodo: collapsedItem === "todo" && collapsedTaskTitle !== null,
    layout: collapsedLayout,
  });
  const focused = useLingeringFlag(alerting, prefersReducedMotion() ? 0 : FOCUS_RELEASE_MS) && !isExpanded && !isTucked && collapsedLayout.includes("text");

  if (noticeReader && preview && !isExpanded && !isTucked) return (
    <div className="island__collapsed island__collapsed--notice">
      <MessageNoticeReader preview={preview} scrolls={noticeReader.scrolls} onMinimize={onMinimize}
        minimizeLabel={minimizesToTray ? t.island.minimizeToTray : t.island.tuckToTop}
        drag={{ onPointerDown: prepareWindowDrag, onPointerMove: handleWindowDragMove, onPointerUp: cancelWindowDrag, onPointerCancel: cancelWindowDrag }} />
    </div>
  );

  // The text and the status icons, placed in the order Settings → Appearance arranged.
  const slots: Record<CollapsedSlot, ReactNode> = {
    // The status light always expands the island, even while a notification is previewed; the
    // preview text beside it is what opens the notification's app.
    pulse: (
      <button
        className="island__light"
        type="button"
        aria-label={collapsedLabel}
        aria-expanded={isExpanded}
        aria-controls="island-panel"
        onPointerDown={prepareWindowDrag}
        onPointerMove={handleWindowDragMove}
        onPointerUp={cancelWindowDrag}
        onPointerCancel={cancelWindowDrag}
        onClick={(event) => {
          if (event.detail !== 0 && didDragRef.current) return;
          event.stopPropagation();
          onExpand();
        }}
      >
        <span className="island__pulse" />
      </button>
    ),
    clock: clockWeather.settings.showClock && (
      <CollapsedClock
        active={!isExpanded && !isTucked}
        hourFormat={clockWeather.settings.hourFormat}
        showSeconds={clockWeather.settings.showSeconds}
        showDateOnHover={clockWeather.settings.showDateOnHover}
      />
    ),
    weather: weatherOn && weather && clockWeather.settings.location
      ? <CollapsedWeather location={clockWeather.settings.location} reading={weather} /> : null,
    text: (
      <div className="island__text-slot">
        <button
          className="island__open-button"
          type="button"
          aria-label={preview
            ? t.messages.noticeOpen(preview.appDisplayName)
            : collapsedLabel}
          aria-expanded={preview ? undefined : isExpanded}
          aria-controls={preview ? undefined : "island-panel"}
          onPointerDown={prepareWindowDrag}
          onPointerMove={handleWindowDragMove}
          onPointerUp={cancelWindowDrag}
          onPointerCancel={cancelWindowDrag}
          onClick={(event) => {
            if (event.detail === 0 || !didDragRef.current) {
              if (preview) {
                openPreview(preview);
              } else {
                onExpand();
              }
            }
          }}
        >
          {updatePending && <span className="island-update-dot island-update-dot--inline" aria-hidden="true" />}
          {/* The new-song popup already shows the cover as its icon, so the bar's own cover waits until it is gone. */}
          {collapsedCover && preview?.kind !== "music" && <img className="collapsed-cover" src={collapsedCover} alt="" draggable={false} />}
          <CollapsedMessageContent preview={preview} enabled={!isExpanded && !isTucked}>
            {showCollapsedText && showTitle && (
              <span className="island__brand">Skerry</span>
            )}
            {showCollapsedText && collapsedItem === "lyrics" && (
              <CollapsedLyric mediaState={mediaState} lyricsSettings={lyricsSettings} active={!isExpanded} />
            )}
            {showCollapsedText && collapsedItem === "todo" && collapsedTaskTitle && (todoTimer && !todoRotation ? (
              <span className={`island__active-task island__active-task--timed${isTodoTimerEndingSoon(todoTimer) ? " island__active-task--ending" : ""}`} key={collapsedTaskTitle}>
                {showTitle ? "· " : ""}
                <>
                  <span className="island__active-task-title">{collapsedTaskTitle}</span>
                  <span className="island__timer-pill">
                    {todoTimer.notified ? t.todo.timeUp : <TodoCountdown endsAt={todoTimer.endsAt} warning={isTodoTimerEndingSoon(todoTimer)} />}
                  </span>
                </>
              </span>
            ) : <CollapsedTodoContent title={collapsedTaskTitle} prefix={showTitle ? "· " : ""} rotation={todoRotation} />)}
            {showCollapsedText && collapsedItem === "todo" && !collapsedTaskTitle && collapsedTodoCount !== null && (
              <span className="island__todo-count">
                {showTitle ? "· " : ""}
                {t.island.pendingTodos(collapsedTodoCount)}
              </span>
            )}
          </CollapsedMessageContent>
        </button>
      </div>
    ),
    shelf: shelfCount !== null && shelfCount > 0 && (
      <button className="island-shelf-count" type="button" aria-label={t.island.shelfCount(shelfCount)} onClick={() => onOpenPage("shelf")}>
        <Inbox size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />
        <span>{shelfCount}</span>
      </button>
      ),
    // Only while a song is playing: an idle or paused player leaves no dotted placeholder on the bar.
    music: showMusic && isMusicPlaying && (
      <MusicWaveButton
        isAvailable={mediaState.available || mediaState.audioActive}
        isPlaying={isMusicPlaying}
        audioPeak={mediaState.audioPeak}
        label={t.island.openMusic}
        onClick={() => onOpenPage("music")}
      />
      ),
    system: (
      <CollapsedSystemChip
        active={!isExpanded && !isTucked}
        onClick={() => onOpenPage("system")}
      />
    ),
  };

  return (
    <div
      className="island__collapsed"
      aria-hidden={isExpanded}
      inert={isExpanded}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onExpand();
        }
      }}
    >
      {focusedCollapsedSlots(collapsedLayout, focused).map((slot) => <Fragment key={slot}>{slots[slot]}</Fragment>)}
      {/* An orange or green dot while an app is using the microphone or camera; not an arrangeable slot, and it stays during an alert. */}
      <PrivacyIndicator active={!isExpanded && !isTucked} />
      {/* Last on the bar, outside the arrangeable slots: tucks the island to the edge. */}
      <button
        className="island-collapsed-minimize"
        type="button"
        aria-label={minimizesToTray ? t.island.minimizeToTray : t.island.tuckToTop}
        onClick={(event) => {
          event.stopPropagation();
          onMinimize();
        }}
      >
        <Minus size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />
      </button>
    </div>
  );
}
