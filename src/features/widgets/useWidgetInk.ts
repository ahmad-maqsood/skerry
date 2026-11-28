import { useEffect, useState } from "react";
import { listenWidgetMoved, sampleWidgetBackdrop, saveWidgetPosition } from "./api";
import { customInk, FALLBACK_INK, pickInk, settleInk, type InkState, type WidgetInk } from "./clock/ink";
import { loadLastAutoColor, saveLastAutoColor } from "./clock/storage";

/** A wallpaper video changes what is behind the widget, so it is looked at again now and then. */
const SAMPLE_EVERY_MS = 5000;
/** Sooner while a new colour waits for a second look to agree with it. */
const CONFIRM_AFTER_MS = 1500;
/** After a drag stops, the place is kept and the new backdrop is read. */
const SETTLE_MS = 500;

const lastInk = () => {
  const color = loadLastAutoColor();
  return color ? customInk(color) : FALLBACK_INK;
};

/**
 * The widget's automatic colour, chosen from what is behind it and kept up to date while `follow`
 * is on. With a colour of the user's own the desktop is not read; a drag's new place is still kept.
 * While the desktop cannot be read (app windows are open) the colour stays as it is.
 */
export function useWidgetInk(follow: boolean): WidgetInk {
  const [ink, setInk] = useState<WidgetInk>(lastInk);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let refreshTimer = 0;
    let settleTimer = 0;
    let state: InkState = { shown: lastInk(), pending: null };
    // The first look, and the first after a drag, is taken as it is: the place is new.
    let takeNext = true;

    const refresh = async () => {
      if (!follow || busy) return;
      busy = true;
      try {
        const backdrop = await sampleWidgetBackdrop();
        if (cancelled) return;
        if (!backdrop) {
          // Two looks must follow each other to agree.
          state = { ...state, pending: null };
        } else {
          const next = pickInk(backdrop);
          state = takeNext ? { shown: next, pending: null } : settleInk(state, next);
          takeNext = false;
          setInk(state.shown);
          saveLastAutoColor(state.shown.color);
        }
      } catch (error) {
        // The lock screen or a busy screen: keep the colour it has and look again later.
        state = { ...state, pending: null };
        console.warn("Could not read what is behind the widget", error);
      } finally {
        busy = false;
        if (!cancelled && follow) {
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => void refresh(), state.pending ? CONFIRM_AFTER_MS : SAMPLE_EVERY_MS);
        }
      }
    };
    void refresh();

    const unlisten = listenWidgetMoved(() => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        void saveWidgetPosition().catch((error: unknown) => console.warn("Could not save the widget position", error));
        takeNext = true;
        void refresh();
      }, SETTLE_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(refreshTimer);
      window.clearTimeout(settleTimer);
      void unlisten.then((stop) => stop()).catch(() => {});
    };
  }, [follow]);

  return ink;
}
