import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Mirrors STATUS_EVENT in src-tauri/src/live_wallpaper/mod.rs.
export const LIVE_WALLPAPER_STATUS_EVENT = "live-wallpaper-status";

/** These three mirror Fit, Settings and Status in src-tauri/src/live_wallpaper/model.rs. */
export type LiveWallpaperFit = "fill" | "fit";
export type LiveWallpaperSettings = { enabled: boolean; path: string; fit: LiveWallpaperFit; pauseOnBattery: boolean };
export type LiveWallpaperStatus =
  | { kind: "off" | "noVideo" | "starting" | "playing" | "paused" | "pausedPower" }
  | { kind: "error"; message: string };

export type LiveWallpaperState = { settings: LiveWallpaperSettings; status: LiveWallpaperStatus };

export function getLiveWallpaper() {
  return invoke<LiveWallpaperState>("get_live_wallpaper");
}

export function setLiveWallpaper(settings: LiveWallpaperSettings) {
  return invoke<LiveWallpaperState>("set_live_wallpaper", { settings });
}

/** The chosen video's path, or null when the picker is cancelled. */
export function pickLiveWallpaperVideo(title: string) {
  return invoke<string | null>("pick_live_wallpaper_video", { title });
}

export function listenLiveWallpaperStatus(handler: (status: LiveWallpaperStatus) => void): Promise<UnlistenFn> {
  if (!isTauri()) return Promise.resolve(() => {});
  return listen<LiveWallpaperStatus>(LIVE_WALLPAPER_STATUS_EVENT, ({ payload }) => handler(payload));
}
