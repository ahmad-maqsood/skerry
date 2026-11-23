import { useEffect, useRef, type MutableRefObject } from "react";
import type { IslandSettings } from "../../features/appearance/types";
import type { ClipboardHistorySnapshot } from "../../features/clipboard/api";
import { copiedTextSince, copyPopupText, newestCopiedAt } from "../../features/clipboard/copyPopup";
import { DEFAULT_CLIPBOARD_HISTORY } from "../../features/clipboard/settings";
import type { MediaState } from "../../features/media/api";
import { isNewTrack, playingTrackKey } from "../../features/media/trackPopup";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { getBatteryStatus } from "../../features/system-monitor/api";
import { chargerChange } from "../../features/system-monitor/chargerPopup";
import { useTranslation } from "../../i18n";
import type { Translations } from "../../i18n/types";

/** A copy made by the island's own "copy again" is not announced, with room for the change event. */
const OWN_COPY_QUIET_MS = 2000;
/** Titles often arrive a beat apart (name, then artist and cover); the song is read once they settle. */
const TRACK_SETTLE_MS = 600;
/** A song already playing when the app starts is not news. */
const STARTUP_GRACE_MS = 4000;
/** How often the charger is looked at; the native check is a single cheap power-status call. */
const CHARGER_POLL_MS = 2000;

type IslandPopupsOptions = {
  settings: Pick<IslandSettings, "clipboardPopup" | "musicPopup" | "musicEnabled" | "chargerPopup">;
  showPreview: SystemNotificationsController["showPreview"];
  clipboardHistory: ClipboardHistorySnapshot;
  ownCopyAtRef: MutableRefObject<number>;
  mediaState: MediaState;
};

/**
 * The island's own pop-ups, shown like a notification (same timing, same slide-out from a tucked
 * island, same game-mode rules, all decided by showPreview): a text just copied, a song that
 * just started playing, and the charger being plugged in or unplugged.
 */
export function useIslandPopups({ settings, showPreview, clipboardHistory, ownCopyAtRef, mediaState }: IslandPopupsOptions) {
  const t = useTranslation();
  useCopyPopup(settings.clipboardPopup, showPreview, clipboardHistory, ownCopyAtRef, t.messages.copiedToClipboard);
  useTrackPopup(settings.musicEnabled && settings.musicPopup, showPreview, mediaState);
  useChargerPopup(settings.chargerPopup, showPreview, t.messages);
}

function useChargerPopup(enabled: boolean, showPreview: IslandPopupsOptions["showPreview"], copy: Translations["messages"]) {
  // Whether the charger was connected at the last reading; undefined until the first one, so the
  // state at start (or when the pop-up is switched on) is not announced.
  const pluggedRef = useRef<boolean | undefined>(undefined);
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  });
  useEffect(() => {
    if (!enabled) {
      pluggedRef.current = undefined;
      return;
    }
    let cancelled = false;
    const check = () => {
      getBatteryStatus()
        .then((battery) => {
          // No battery (a desktop PC) or no reading: nothing to announce.
          if (cancelled || !battery?.hasBattery) return;
          const change = chargerChange(pluggedRef.current, battery.isPluggedIn);
          pluggedRef.current = battery.isPluggedIn;
          if (!change) return;
          const text = copyRef.current;
          const now = Date.now();
          showPreview({
            id: `battery-${change}-${now}`,
            appId: "battery",
            appDisplayName: text.batteryName,
            title: change === "plugged" ? text.chargerPluggedIn : text.chargerUnplugged,
            body: text.batteryLevel(battery.percent),
            timestamp: now,
            kind: "battery",
          });
        })
        .catch(() => {
          // Not running in the desktop app, or the power status could not be read: try again next time.
        });
    };
    check();
    const timer = window.setInterval(check, CHARGER_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, showPreview]);
}

function useCopyPopup(
  enabled: boolean,
  showPreview: IslandPopupsOptions["showPreview"],
  history: ClipboardHistorySnapshot,
  ownCopyAtRef: MutableRefObject<number>,
  title: string,
) {
  // The newest copy time seen; null until the history has been read once, so what was already
  // there at start is not announced.
  const seenRef = useRef<number | null>(null);
  useEffect(() => {
    if (history === DEFAULT_CLIPBOARD_HISTORY) return;
    const seen = seenRef.current;
    seenRef.current = Math.max(seen ?? 0, newestCopiedAt(history.items));
    if (seen === null || !enabled || !history.settings.enabled || history.settings.paused) return;
    if (Date.now() - ownCopyAtRef.current < OWN_COPY_QUIET_MS) return;
    const item = copiedTextSince(history.items, seen);
    if (!item) return;
    showPreview({
      id: `clipboard-${item.id}-${item.copiedAt}`,
      appId: "clipboard",
      appDisplayName: title,
      title,
      body: copyPopupText(item),
      timestamp: item.copiedAt,
      kind: "clipboard",
    });
  }, [enabled, history, ownCopyAtRef, showPreview, title]);
}

function useTrackPopup(enabled: boolean, showPreview: IslandPopupsOptions["showPreview"], mediaState: MediaState) {
  const key = playingTrackKey(mediaState);
  const latestRef = useRef(mediaState);
  const lastKeyRef = useRef<string | null | undefined>(undefined);
  const startedAtRef = useRef(Date.now());
  useEffect(() => {
    latestRef.current = mediaState;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const last = lastKeyRef.current;
      if (key === null) {
        // Paused or stopped: the last song stays remembered, so resuming it is not a new one.
        if (last === undefined) lastKeyRef.current = null;
        return;
      }
      lastKeyRef.current = key;
      if (!enabled || !isNewTrack(last, key) || Date.now() - startedAtRef.current < STARTUP_GRACE_MS) return;
      const song = latestRef.current;
      showPreview({
        id: `music-${key}`,
        appId: "music",
        appDisplayName: song.sourceApp || "Music",
        title: song.title ?? "",
        body: song.artist ?? "",
        timestamp: Date.now(),
        appLogo: song.thumbnail,
        kind: "music",
      });
    }, TRACK_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, key, showPreview]);
}
