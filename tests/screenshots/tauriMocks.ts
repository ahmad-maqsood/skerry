// Inside the native WebView, Tauri defines __TAURI_INTERNALS__ (and its `invoke`, `metadata`, ...)
// as read-only, in the scene's iframe as well as the top frame, so the official
// @tauri-apps/api/mocks helper and a plain `internals.invoke = ...` throw "Cannot assign to read
// only property 'invoke'". These mocks first try to change the object Tauri provided; when it
// refuses, they put a mutable copy in its place on `window`. @tauri-apps/api reads
// window.__TAURI_INTERNALS__ on every call, so the copy is picked up straight away.
type MockHandler = (command: string, payload?: unknown) => unknown;

type EventArgs = {
  event: string;
  handler?: number;
  eventId?: number;
  payload?: unknown;
};

type Bag = Record<string, unknown>;

/** Sets `key` on `target`, redefining it when it is configurable; false when neither works. */
function setProperty(target: Bag, key: string, value: unknown): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  try {
    if (!descriptor) {
      if (!Object.isExtensible(target)) return false;
      target[key] = value;
    } else if (descriptor.writable) {
      target[key] = value;
    } else if (descriptor.configurable) {
      Object.defineProperty(target, key, { value, writable: true, configurable: true, enumerable: true });
    } else {
      return false;
    }
    return target[key] === value;
  } catch {
    return false;
  }
}

/** Puts `value` on `window` under `name`, even over a read-only property when it is configurable. */
function replaceWindowProperty(name: string, value: Bag): void {
  if (!setProperty(window as unknown as Bag, name, value)) {
    throw new Error(`Cannot replace window.${name} in the native screenshot WebView; it is not configurable.`);
  }
}

/**
 * The object behind window.<name> with every key in `values` set on it. When Tauri's own object
 * is read-only, a copy of it (own data properties) with the new values replaces it on window.
 */
function installInternals(name: string, values: Bag): Bag {
  const existing = (window as unknown as Bag)[name];
  const current: Bag = existing && typeof existing === "object" ? (existing as Bag) : {};
  const settable = Object.entries(values).every(([key, value]) => setProperty(current, key, value));
  if (existing && settable) return current;
  const copy: Bag = {};
  for (const key of Object.keys(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor && "value" in descriptor) copy[key] = descriptor.value;
  }
  Object.assign(copy, values);
  replaceWindowProperty(name, copy);
  return copy;
}

export function mockWindows(current: string): void {
  installInternals("__TAURI_INTERNALS__", {
    metadata: {
      currentWindow: { label: current },
      currentWebview: { windowLabel: current, label: current },
    },
  });
}

export function mockIPC(
  handler: MockHandler,
  options: { shouldMockEvents?: boolean } = {},
): void {
  const callbacks = new Map<number, (data: unknown) => void>();
  const listeners = new Map<string, number[]>();

  const unregisterCallback = (id: number) => callbacks.delete(id);
  const registerCallback = (callback?: (data: unknown) => void, once = false) => {
    const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
    callbacks.set(id, (data) => {
      if (once) unregisterCallback(id);
      callback?.(data);
    });
    return id;
  };
  const runCallback = (id: number, data: unknown) => callbacks.get(id)?.(data);

  const invoke = async (command: string, payload?: unknown): Promise<unknown> => {
    if (options.shouldMockEvents && command.startsWith("plugin:event|")) {
      const args = (payload ?? {}) as EventArgs;
      switch (command) {
        case "plugin:event|listen": {
          const ids = listeners.get(args.event) ?? [];
          if (args.handler === undefined) throw new Error("Event listener is missing its callback ID.");
          ids.push(args.handler);
          listeners.set(args.event, ids);
          return args.handler;
        }
        case "plugin:event|emit":
          for (const id of [...(listeners.get(args.event) ?? [])]) {
            runCallback(id, { event: args.event, id, payload: args.payload });
          }
          return null;
        case "plugin:event|unlisten": {
          const ids = listeners.get(args.event) ?? [];
          const index = args.eventId === undefined ? -1 : ids.indexOf(args.eventId);
          if (index !== -1) ids.splice(index, 1);
          return null;
        }
      }
    }
    return handler(command, payload);
  };

  installInternals("__TAURI_INTERNALS__", {
    invoke,
    transformCallback: registerCallback,
    unregisterCallback,
    runCallback,
    callbacks,
  });
  installInternals("__TAURI_EVENT_PLUGIN_INTERNALS__", {
    unregisterListener: (_event: string, eventId: number) => unregisterCallback(eventId),
  });
}
