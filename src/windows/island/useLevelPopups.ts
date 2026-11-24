import { useEffect, useRef } from "react";
import { levelChange } from "../../features/device-status/levelPopup";
import type { PreviewKind } from "../../features/messages/messagePreview";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";
import { getBrightness, getSystemVolume } from "../../features/quick-controls/api";
import { brightnessToPercent, volumeToPercent } from "../../features/quick-controls/quickControls";
import type { Translations } from "../../i18n/types";

/** The volume read is a short audio call, so it is looked at often enough to follow a key held down. */
const VOLUME_POLL_MS = 400;
/** The brightness read is a hidden PowerShell call: slower, and only while a pop-up could show. */
const BRIGHTNESS_POLL_MS = 1500;
/** Adaptive brightness nudges the panel by a point or two; only a real step is announced. */
const BRIGHTNESS_MIN_STEP = 2;

type ShowPreview = SystemNotificationsController["showPreview"];
type LevelKind = Extract<PreviewKind, "volume" | "brightness">;

const readVolume = () => getSystemVolume().then(volumeToPercent);
const readBrightness = () => getBrightness().then(brightnessToPercent);

/**
 * Pop-ups for the system volume and the built-in display's brightness changing, drawn as a bar.
 * `active` is whether a pop-up could show now (the island is collapsed): polling stops otherwise,
 * and the first reading after it resumes only sets the baseline, so a change made from the System
 * page's sliders is not announced when the island closes.
 */
export function useLevelPopups({ volume, brightness, active, showPreview, copy }: {
  volume: boolean;
  brightness: boolean;
  active: boolean;
  showPreview: ShowPreview;
  copy: Translations["messages"];
}) {
  useLevelPopup({ kind: "volume", enabled: volume && active, read: readVolume, intervalMs: VOLUME_POLL_MS, minStep: 1, name: copy.volumeName, showPreview });
  useLevelPopup({ kind: "brightness", enabled: brightness && active, read: readBrightness, intervalMs: BRIGHTNESS_POLL_MS, minStep: BRIGHTNESS_MIN_STEP, name: copy.brightnessName, showPreview });
}

function useLevelPopup({ kind, enabled, read, intervalMs, minStep, name, showPreview }: {
  kind: LevelKind;
  enabled: boolean;
  read: () => Promise<number | null>;
  intervalMs: number;
  minStep: number;
  name: string;
  showPreview: ShowPreview;
}) {
  const nameRef = useRef(name);
  useEffect(() => {
    nameRef.current = name;
  });
  useEffect(() => {
    if (!enabled) return;
    // The level at the last reading; undefined until the first one.
    let previous: number | undefined;
    let cancelled = false;
    let reading = false;
    // A display with no brightness (a desktop PC, an external monitor) answers null: stop asking.
    let unsupported = false;
    const check = () => {
      if (reading || unsupported) return;
      reading = true;
      read()
        .then((level) => {
          if (cancelled) return;
          if (level === null) {
            unsupported = true;
            return;
          }
          const shown = levelChange(previous, level, minStep);
          previous = level;
          if (shown === null) return;
          // One id per kind: the bar of a pop-up that is still showing moves instead of sliding in again.
          showPreview({
            id: `level-${kind}`,
            appId: kind,
            appDisplayName: nameRef.current,
            title: "",
            body: `${shown}%`,
            timestamp: Date.now(),
            kind,
            level: shown,
          });
        })
        .catch(() => {
          // Not running in the desktop app, or the level could not be read: try again next time.
        })
        .finally(() => {
          reading = false;
        });
    };
    check();
    const timer = window.setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, kind, minStep, read, showPreview]);
}
