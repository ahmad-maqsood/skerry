// Open /tests/notification-startup.html with pnpm dev to run the browser regression checks.
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import { useSystemNotifications, type SystemNotificationsController } from "../../src/features/messages/system-notifications/useSystemNotifications";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const keys = [
  "skerry-system-notifications-enabled",
  "skerry-hide-notification-text",
  "skerry-muted-apps",
  "skerry-system-notification-access-requested",
];
const original = keys.map((key) => localStorage.getItem(key));
const messages: string[] = [];
const calls: { command: string; args: Record<string, unknown> }[] = [];
let accessStatus = "Allowed";
const STATUS: Record<string, string> = { Allowed: "listening", Denied: "permissionDenied", Unspecified: "permissionRequired" };
let revision = 0;
let sys: SystemNotificationsController;
let root: Root | undefined;

mockIPC((command, payload) => {
  const args = (payload ?? {}) as Record<string, unknown>;
  calls.push({ command, args });
  if (command === "request_system_notification_access") return accessStatus;
  if (command === "get_system_notifications_state") return {
    revision: ++revision,
    enabled: true,
    status: STATUS[accessStatus],
    hideText: false,
    mutedApps: [],
    knownApps: [],
    items: [],
  };
  if (command === "set_system_notifications_enabled") return {
    revision: ++revision,
    enabled: Boolean(args.enabled),
    status: STATUS[accessStatus],
    hideText: false,
    mutedApps: [],
    knownApps: [],
    items: [],
  };
  if (command === "open_system_notification_settings") return null;
}, { shouldMockEvents: true });

function Fixture() {
  sys = useSystemNotifications(true);
  return <div data-testid="sys-status">{sys.snapshot.status}</div>;
}

async function mount() {
  if (root) await act(async () => root!.unmount());
  root = createRoot(document.getElementById("fixture")!);
  await act(async () => { root!.render(<StrictMode><Fixture /></StrictMode>); });
}

function reset(access: string) {
  keys.forEach((key) => localStorage.removeItem(key));
  calls.length = 0;
  accessStatus = access;
}

function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}

const requests = () => calls.filter((call) => call.command === "request_system_notification_access").length;

try {
  reset("Allowed");
  await mount();
  check(sys!.snapshot.enabled, "System notifications enabled by default on initial launch");
  check(requests() === 1, "StrictMode initialization requests notification access only once");
  await mount();
  check(requests() === 1, "Subsequent launches do not re-request authorization");

  await act(async () => { await sys!.setEnabled(false); });
  check(localStorage.getItem(keys[0]) === "false", "Disabled preference persisted to storage key");
  await mount();
  check(!sys!.snapshot.enabled && requests() === 1, "Remains disabled after restart without requesting authorization");

  reset("Denied");
  await mount();
  check(sys!.snapshot.status === "permissionDenied", "Preserves preference and shows Denied status");
  await act(async () => { await sys!.openSettings(false); });
  check(calls.some((call) => call.command === "open_system_notification_settings"), "Opens Windows notification settings");

  reset("Unspecified");
  await mount();
  check(sys!.snapshot.status === "permissionRequired", "Shows Unspecified status when pending user action");
  await act(async () => { await sys!.requestAccess(); });
  check(requests() >= 2, "User can manually re-initiate authorization request");

  document.getElementById("results")!.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
} catch (error) {
  document.getElementById("results")!.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
  console.error(error);
} finally {
  keys.forEach((key, index) => original[index] === null ? localStorage.removeItem(key) : localStorage.setItem(key, original[index]!));
}
