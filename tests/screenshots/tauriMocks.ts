// Tauri installs __TAURI_INTERNALS__ as a read-only Window property in a native WebView.
// The official @tauri-apps/api/mocks helper tries to assign that property, which only works
// in a plain browser test. For native screenshot capture, keep Tauri's object and replace
// the IPC methods on that object instead.
type MockHandler = (command: string, payload?: unknown) => unknown;

type EventArgs = {
  event: string;
  handler?: number;
  eventId?: number;
  payload?: unknown;
};

function internals(name: string): Record<string, unknown> {
  const value = (window as unknown as Record<string, unknown>)[name];
  if (!value || typeof value !== "object") {
    throw new Error(`Tauri did not provide window.${name} in the native screenshot WebView.`);
  }
  return value as Record<string, unknown>;
}

export function mockWindows(current: string): void {
  const tauri = internals("__TAURI_INTERNALS__");
  tauri.metadata = {
    currentWindow: { label: current },
    currentWebview: { windowLabel: current, label: current },
  };
}

export function mockIPC(
  handler: MockHandler,
  options: { shouldMockEvents?: boolean } = {},
): void {
  const tauri = internals("__TAURI_INTERNALS__");
  const eventWindow = window as unknown as Record<string, unknown>;
  let eventInternals = eventWindow.__TAURI_EVENT_PLUGIN_INTERNALS__ as Record<string, unknown> | undefined;
  if (!eventInternals || typeof eventInternals !== "object") {
    eventInternals = {};
    Object.defineProperty(eventWindow, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
      value: eventInternals,
      configurable: true,
    });
  }
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

  // Mutate the existing native Tauri object; never reassign window.__TAURI_INTERNALS__.
  tauri.invoke = invoke;
  tauri.transformCallback = registerCallback;
  tauri.unregisterCallback = unregisterCallback;
  tauri.runCallback = runCallback;
  tauri.callbacks = callbacks;
  eventInternals.unregisterListener = (_event: string, eventId: number) => unregisterCallback(eventId);
}
