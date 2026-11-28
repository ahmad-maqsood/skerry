import { useEffect, useState } from "react";
import { listenWidgetMoved, sampleWidgetBackdrop, saveWidgetPosition } from "./api";
import { FALLBACK_INK, pickInk, type WidgetInk } from "./clock/ink";

/** A wallpaper video changes what is behind the widget, so it is looked at again now and then. */
const SAMPLE_EVERY_MS = 5000;
/** After a drag stops, the place is kept and the new backdrop is read. */
const SETTLE_MS = 500;

/**
 * The widget's automatic colour, chosen from what is behind it and kept up to date while `follow`
 * is on. With a colour of the user's own the desktop is not read; a drag's new place is still kept.
 */
export function useWidgetInk(follow: boolean): WidgetInk {
  const [ink, setInk] = useState<WidgetInk>(FALLBACK_INK);

  useEffect(() => {
    let cancelled = false;
    let busy = false;
    let refreshTimer = 0;
    let settleTimer = 0;

    const refresh = async () => {
      if (!follow || busy) return;
      busy = true;
      try {
        const backdrop = await sampleWidgetBackdrop();
        if (!cancelled && backdrop) setInk(pickInk(backdrop));
      } catch (error) {
        // The lock screen or a busy screen: keep the colour it has and look again later.
        console.warn("Could not read what is behind the widget", error);
      } finally {
        busy = false;
        if (!cancelled) {
          window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => void refresh(), SAMPLE_EVERY_MS);
        }
      }
    };
    void refresh();

    const unlisten = listenWidgetMoved(() => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        void saveWidgetPosition().catch((error: unknown) => console.warn("Could not save the widget position", error));
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
