// Safe read/write wrapper for localStorage. Never throws when storage is disabled,
// quota is exceeded, or data is corrupted; callers (each directory's storage.ts) decide
// fallback values; data format validation is done in each caller's normalize function.

/** Reads a string; returns null when missing or storage is unavailable. */
export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a string; returns false on failure without throwing. */
export function writeString(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Removes an item; returns false on failure without throwing. */
export function removeItem(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads and parses JSON. Returns undefined when missing, storage is unavailable, or parsing fails.
 * Returned value is unvalidated unknown and must be normalized before use.
 */
export function readJson(key: string): unknown {
  const stored = readString(key);
  if (stored === null) return undefined;
  try {
    return JSON.parse(stored) as unknown;
  } catch {
    return undefined;
  }
}

/** Serializes and writes JSON; returns false on failure without throwing. */
export function writeJson(key: string, value: unknown): boolean {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return false;
  }
  if (serialized === undefined) return false;
  return writeString(key, serialized);
}
