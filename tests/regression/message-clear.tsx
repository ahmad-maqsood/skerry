import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import "../../src/windows/island/IslandApp.css";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { MessagesPanel } from "../../src/features/messages/Messages";
import { useSystemNotifications } from "../../src/features/messages/system-notifications/useSystemNotifications";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const query = new URLSearchParams(location.search);
const en = query.get("lang") === "en";
const keys = ["skerry-locale", "skerry-system-notification-access-requested"];
const original = keys.map((key) => localStorage.getItem(key));
window.addEventListener("beforeunload", () => keys.forEach((key, index) => {
  if (original[index] === null) localStorage.removeItem(key); else localStorage.setItem(key, original[index]!);
}));
localStorage.setItem(keys[0], en ? "en" : "en");
localStorage.setItem(keys[1], "true");

let revision = 1;
let items = [
  { id: "1", appId: "app-a", appDisplayName: "Slack", title: "Channel", body: "Hello", bodyLines: ["Hello"], timestamp: Date.now() - 1000, appLogo: null },
  { id: "2", appId: "app-a", appDisplayName: "Slack", title: "Direct", body: "Hey", bodyLines: ["Hey"], timestamp: Date.now() - 500, appLogo: null },
  { id: "3", appId: "app-b", appDisplayName: "WhatsApp", title: "Bob", body: "Ping", bodyLines: ["Ping"], timestamp: Date.now(), appLogo: null },
];

mockIPC(async (command, payload) => {
  const args = (payload ?? {}) as Record<string, unknown>;
  if (command === "request_system_notification_access") return "Allowed";
  if (command === "get_system_notifications_state" || command === "set_system_notifications_enabled" || command === "set_app_muted" || command === "set_hide_notification_text") return {
    revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items,
  };
  if (command === "dismiss_system_notification") {
    items = items.filter((i) => i.id !== args.id);
    return { revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items };
  }
  if (command === "dismiss_system_notification_app") {
    items = items.filter((i) => i.appId !== args.appId);
    return { revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items };
  }
  if (command === "clear_system_notifications") {
    items = [];
    return { revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items };
  }
  return null;
}, { shouldMockEvents: true });

function Fixture() {
  const controller = useSystemNotifications(false);
  return <MessagesPanel controller={controller} />;
}

const root = createRoot(document.getElementById("fixture")!);
const passed: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  passed.push(`PASS ${message}`);
};

try {
  await act(async () => root.render(<StrictMode><I18nProvider><Fixture /></I18nProvider></StrictMode>));
  const groups = document.querySelectorAll(".messages-app-group");
  check(groups.length === 2, "Items grouped into 2 distinct applications");

  const clearAllBtn = document.querySelector<HTMLButtonElement>(".messages-toolbar__action")!;
  check(Boolean(clearAllBtn), "Clear all button rendered");

  const appClearBtns = document.querySelectorAll<HTMLButtonElement>(".messages-app-header__dismiss");
  check(appClearBtns.length === 2, "Per-app clear buttons rendered for each group");

  await act(async () => {
    appClearBtns[0].click();
  });
  check(items.length === 1, "Per-app clear removes notifications for target app");

  await act(async () => {
    clearAllBtn.click();
  });
  check(items.length === 0, "Clear all clears all remaining notifications");

  document.getElementById("results")!.textContent = `${passed.join("\n")}\n\nAll ${passed.length} checks passed.`;
} catch (error) {
  document.getElementById("results")!.textContent = `${passed.join("\n")}\nFAIL ${String(error)}`;
  console.error(error);
}
