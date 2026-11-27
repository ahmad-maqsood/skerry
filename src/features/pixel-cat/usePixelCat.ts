import { useSyncExternalStore } from "react";
import { PIXEL_CAT_KEY, loadPixelCatSettings, savePixelCatSettings } from "./storage";
import { pixelCatShown, type PixelCatSettings } from "./model";

// Shared by the island and the settings window: both read the same localStorage key, and the
// island rereads it when the other window changes it.
let current: PixelCatSettings | null = null;
const listeners = new Set<() => void>();
const snapshot = () => current ??= loadPixelCatSettings();
function reread() {
  const next = loadPixelCatSettings();
  if (current && current.enabled === next.enabled && current.whilePlaying === next.whilePlaying) return;
  current = next;
  listeners.forEach((listener) => listener());
}
function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === PIXEL_CAT_KEY) reread();
}
function subscribe(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", reread);
    document.documentElement.addEventListener("pointerenter", reread);
    reread();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", reread);
      document.documentElement.removeEventListener("pointerenter", reread);
    }
  };
}

export function usePixelCat() {
  const settings = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { settings };
}

/** Whether the cat is on the island now; `songPlaying` is whether a song is playing. */
export function usePixelCatShown(songPlaying: boolean) {
  return pixelCatShown(usePixelCat().settings, songPlaying);
}

export function setPixelCatSettings(settings: PixelCatSettings) {
  savePixelCatSettings(settings);
  reread();
}
