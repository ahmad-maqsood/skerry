/** A device is told apart by its name, whichever radio (classic or LE) reports it. */
export function bluetoothKey(name: string): string {
  return name.trim().toLowerCase();
}

/** How long after announcing a device it stays quiet: some devices drop and rejoin every few seconds. */
export const BLUETOOTH_COOLDOWN_MS = 20_000;

/**
 * The names of devices that connected since the last reading. `previous` is the set of keys the
 * reading before it had: undefined until the first one is in, so what is already connected when
 * the app starts is not news. `announcedAt` holds when each key was last announced.
 */
export function newBluetoothDevices(
  previous: ReadonlySet<string> | undefined,
  devices: readonly { name: string }[],
  announcedAt: ReadonlyMap<string, number>,
  now: number,
): string[] {
  if (previous === undefined) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const { name } of devices) {
    const key = bluetoothKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (previous.has(key)) continue;
    const last = announcedAt.get(key);
    if (last !== undefined && now - last < BLUETOOTH_COOLDOWN_MS) continue;
    names.push(name.trim());
  }
  return names;
}
