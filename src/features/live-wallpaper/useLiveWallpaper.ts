import { useEffect, useState } from "react";
import {
  getLiveWallpaper, listenLiveWallpaperStatus, pickLiveWallpaperVideo, setLiveWallpaper,
  type LiveWallpaperSettings, type LiveWallpaperState,
} from "./api";

/** The live wallpaper as the native side has it; `state` is null until it has been read. */
export function useLiveWallpaper() {
  const [state, setState] = useState<LiveWallpaperState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => getLiveWallpaper()
      .then((next) => { if (!cancelled) setState(next); })
      .catch((reason: unknown) => { if (!cancelled) setError(String(reason)); });
    // Read after listening, so a status that changes in between is not missed.
    const unlisten = listenLiveWallpaperStatus((status) => setState((current) => current && { ...current, status }));
    void unlisten.then(refresh);
    return () => { cancelled = true; void unlisten.then((stop) => stop()); };
  }, []);

  const save = async (settings: LiveWallpaperSettings) => {
    setError(null);
    try {
      setState(await setLiveWallpaper(settings));
    } catch (reason) {
      setError(String(reason));
    }
  };

  const chooseVideo = async (title: string) => {
    setError(null);
    try {
      const path = await pickLiveWallpaperVideo(title);
      if (path && state) await save({ ...state.settings, path });
    } catch (reason) {
      setError(String(reason));
    }
  };

  return { state, error, save, chooseVideo };
}
