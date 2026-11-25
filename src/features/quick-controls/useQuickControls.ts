import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrightness, getSystemVolume, setBrightness, setSystemVolume } from "./api.ts";
import { createLatestRunner } from "./latestRunner.ts";
import { loadLastReadings, saveLastReadings } from "./storage.ts";
import {
  BRIGHTNESS_DELAY_MS,
  brightnessToPercent,
  clampPercent,
  MIN_BRIGHTNESS_PERCENT,
  percentToVolume,
  VOLUME_DELAY_MS,
  volumeToPercent,
} from "./quickControls.ts";

/**
 * The last readings, kept across the System page closing and opening again, and across restarts
 * (storage.ts). The first read has to open the WMI connection, so without these the sliders could be
 * missing on a first visit and pop in a moment later.
 */
const lastKnown: { volume: number | null; brightness: number | null } = loadLastReadings();

function remember(): void {
  saveLastReadings(lastKnown);
}

/** Reads both levels ahead of the System page opening, so its sliders are there on the first frame. */
export function warmQuickControls(): Promise<void> {
  const volume = getSystemVolume()
    .then((level) => {
      lastKnown.volume = volumeToPercent(level);
    })
    .catch(() => {});
  const brightness = getBrightness()
    .then((reading) => {
      lastKnown.brightness = brightnessToPercent(reading);
    })
    .catch(() => {});
  return Promise.all([volume, brightness]).then(remember);
}

/**
 * The system volume and the built-in display's brightness as slider percentages. A value is null
 * until it has been read for the first time, and stays null where it cannot be (no audio output, no
 * laptop panel); after that the last reading shows at once while a fresh one is fetched.
 */
export function useQuickControls() {
  const [volume, setVolumeState] = useState<number | null>(lastKnown.volume);
  const [brightness, setBrightnessState] = useState<number | null>(lastKnown.brightness);

  const volumeRunner = useMemo(() => createLatestRunner((percent) => setSystemVolume(percentToVolume(percent)), VOLUME_DELAY_MS), []);
  const brightnessRunner = useMemo(() => createLatestRunner((percent) => setBrightness(percent), BRIGHTNESS_DELAY_MS), []);

  useEffect(() => {
    let cancelled = false;
    void getSystemVolume()
      .then((level) => {
        if (cancelled) return;
        lastKnown.volume = volumeToPercent(level);
        setVolumeState(lastKnown.volume);
        remember();
      })
      .catch(() => {});
    void getBrightness()
      .then((reading) => {
        if (cancelled) return;
        lastKnown.brightness = brightnessToPercent(reading);
        setBrightnessState(lastKnown.brightness);
        remember();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      // A change made just before the panel closed still goes through.
      volumeRunner.flush();
      brightnessRunner.flush();
    };
  }, [volumeRunner, brightnessRunner]);

  const changeVolume = useCallback(
    (percent: number) => {
      const next = clampPercent(percent);
      lastKnown.volume = next;
      setVolumeState(next);
      volumeRunner.push(next);
    },
    [volumeRunner],
  );

  const changeBrightness = useCallback(
    (percent: number) => {
      const next = clampPercent(percent, MIN_BRIGHTNESS_PERCENT);
      lastKnown.brightness = next;
      setBrightnessState(next);
      brightnessRunner.push(next);
    },
    [brightnessRunner],
  );

  return { volume, brightness, changeVolume, changeBrightness };
}
