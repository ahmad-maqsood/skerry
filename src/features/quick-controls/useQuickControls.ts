import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrightness, getSystemVolume, setBrightness, setSystemVolume } from "./api.ts";
import { createLatestRunner } from "./latestRunner.ts";
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
 * The system volume and the built-in display's brightness as slider percentages. A value is null
 * until it has been read, and stays null where it cannot be (no audio output, no laptop panel).
 */
export function useQuickControls() {
  const [volume, setVolume] = useState<number | null>(null);
  const [brightness, setBrightnessState] = useState<number | null>(null);

  const volumeRunner = useMemo(() => createLatestRunner((percent) => setSystemVolume(percentToVolume(percent)), VOLUME_DELAY_MS), []);
  const brightnessRunner = useMemo(() => createLatestRunner((percent) => setBrightness(percent), BRIGHTNESS_DELAY_MS), []);

  useEffect(() => {
    let cancelled = false;
    void getSystemVolume()
      .then((level) => {
        if (!cancelled) setVolume(volumeToPercent(level));
      })
      .catch(() => {});
    void getBrightness()
      .then((reading) => {
        if (!cancelled) setBrightnessState(brightnessToPercent(reading));
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
      setVolume(next);
      volumeRunner.push(next);
    },
    [volumeRunner],
  );

  const changeBrightness = useCallback(
    (percent: number) => {
      const next = clampPercent(percent, MIN_BRIGHTNESS_PERCENT);
      setBrightnessState(next);
      brightnessRunner.push(next);
    },
    [brightnessRunner],
  );

  return { volume, brightness, changeVolume, changeBrightness };
}
