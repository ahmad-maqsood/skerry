import { useEffect, useRef } from "react";
import { getAirplaneMode, getCapsLock, getConnectedBluetoothDevices } from "../../features/device-status/api";
import { airplaneChange } from "../../features/device-status/airplanePopup";
import { capsLockChange } from "../../features/device-status/capsLockPopup";
import { bluetoothKey, newBluetoothDevices } from "../../features/device-status/bluetoothPopup";
import type { Translations } from "../../i18n/types";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";

/** How often the connected Bluetooth devices are read; the native read is one short device query. */
const BLUETOOTH_POLL_MS = 3000;
/** How often airplane mode is read; the native read is one registry value. */
const AIRPLANE_POLL_MS = 2000;
/** How often Caps Lock is read; one key-state call, fast enough that the pop-up follows the keypress. */
const CAPS_LOCK_POLL_MS = 250;

type ShowPreview = SystemNotificationsController["showPreview"];

/**
 * Pop-ups for what happens to the PC's devices: a Bluetooth device connecting (named), airplane
 * mode switching and Caps Lock switching. Shown like a notification through showPreview, which decides when they may show.
 */
export function useDevicePopups({ bluetooth, airplane, capsLock, showPreview, copy }: {
  bluetooth: boolean;
  airplane: boolean;
  capsLock: boolean;
  showPreview: ShowPreview;
  copy: Translations["messages"];
}) {
  useBluetoothPopup(bluetooth, showPreview, copy);
  useAirplanePopup(airplane, showPreview, copy);
  useCapsLockPopup(capsLock, showPreview, copy);
}

function useBluetoothPopup(enabled: boolean, showPreview: ShowPreview, copy: Translations["messages"]) {
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  });
  useEffect(() => {
    if (!enabled) return;
    // Keys of the devices connected at the last reading; undefined until the first one.
    let previous: Set<string> | undefined;
    const announcedAt = new Map<string, number>();
    let cancelled = false;
    let reading = false;
    const check = () => {
      if (reading) return;
      reading = true;
      getConnectedBluetoothDevices()
        .then((devices) => {
          if (cancelled) return;
          const now = Date.now();
          const names = newBluetoothDevices(previous, devices, announcedAt, now);
          previous = new Set(devices.map((device) => bluetoothKey(device.name)).filter(Boolean));
          if (names.length === 0) return;
          for (const name of names) announcedAt.set(bluetoothKey(name), now);
          const text = copyRef.current;
          showPreview({
            id: `bluetooth-${now}`,
            appId: "bluetooth",
            appDisplayName: text.bluetoothName,
            title: names.join(", "),
            body: text.bluetoothConnected,
            timestamp: now,
            kind: "bluetooth",
          });
        })
        .catch(() => {
          // Not running in the desktop app, or Bluetooth cannot be read: keep the last reading, try again.
        })
        .finally(() => {
          reading = false;
        });
    };
    check();
    const timer = window.setInterval(check, BLUETOOTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, showPreview]);
}

function useAirplanePopup(enabled: boolean, showPreview: ShowPreview, copy: Translations["messages"]) {
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  });
  useEffect(() => {
    if (!enabled) return;
    // Whether airplane mode was on at the last reading; undefined until the first one.
    let previous: boolean | undefined;
    let cancelled = false;
    const check = () => {
      getAirplaneMode()
        .then((on) => {
          // No setting (a desktop PC without radios): nothing to announce.
          if (cancelled || on === null) return;
          const change = airplaneChange(previous, on);
          previous = on;
          if (!change) return;
          const now = Date.now();
          showPreview({
            id: `airplane-${change}-${now}`,
            appId: "airplane",
            appDisplayName: copyRef.current.airplaneName,
            title: change === "on" ? copyRef.current.airplaneOn : copyRef.current.airplaneOff,
            body: "",
            timestamp: now,
            kind: "airplane",
          });
        })
        .catch(() => {
          // Not running in the desktop app, or the setting could not be read: try again next time.
        });
    };
    check();
    const timer = window.setInterval(check, AIRPLANE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, showPreview]);
}

function useCapsLockPopup(enabled: boolean, showPreview: ShowPreview, copy: Translations["messages"]) {
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  });
  useEffect(() => {
    if (!enabled) return;
    // Whether Caps Lock was on at the last reading; undefined until the first one.
    let previous: boolean | undefined;
    let cancelled = false;
    const check = () => {
      getCapsLock()
        .then((on) => {
          if (cancelled) return;
          const change = capsLockChange(previous, on);
          previous = on;
          if (!change) return;
          const now = Date.now();
          showPreview({
            id: `caps-lock-${now}`,
            appId: "capsLock",
            appDisplayName: copyRef.current.capsLockName,
            title: change === "on" ? copyRef.current.capsLockOn : copyRef.current.capsLockOff,
            body: "",
            timestamp: now,
            kind: "capsLock",
          });
        })
        .catch(() => {
          // Not running in the desktop app, or the key state could not be read: try again next time.
        });
    };
    check();
    const timer = window.setInterval(check, CAPS_LOCK_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, showPreview]);
}
