import { useEffect, useRef } from "react";
import { getConnectedBluetoothDevices } from "../../features/device-status/api";
import { bluetoothKey, newBluetoothDevices } from "../../features/device-status/bluetoothPopup";
import type { Translations } from "../../i18n/types";
import type { SystemNotificationsController } from "../../features/messages/system-notifications/useSystemNotifications";

/** How often the connected Bluetooth devices are read; the native read is one short device query. */
const BLUETOOTH_POLL_MS = 3000;

type ShowPreview = SystemNotificationsController["showPreview"];

/**
 * Pop-ups for what happens to the PC's devices: a Bluetooth device connecting (named), and more to
 * come. Shown like a notification through showPreview, which decides when they may show.
 */
export function useDevicePopups({ bluetooth, showPreview, copy }: {
  bluetooth: boolean;
  showPreview: ShowPreview;
  copy: Translations["messages"];
}) {
  useBluetoothPopup(bluetooth, showPreview, copy);
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
