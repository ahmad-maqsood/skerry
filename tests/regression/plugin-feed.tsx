import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import "../../src/windows/island/IslandApp.css";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { MessagesPanel } from "../../src/features/messages/Messages";
import { useSystemNotifications } from "../../src/features/messages/system-notifications/useSystemNotifications";
import { usePluginFeed } from "../../src/features/plugins";
import { PLUGIN_DISMISSED_KEY } from "../../src/features/plugins/storage";
import { PluginMessagesSection } from "../../src/windows/island/PluginMessagesSection";

// Opened with ?features=enabled: the plugin host is switched on, as in development builds.
Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const keys = ["skerry-locale", "skerry-system-notification-access-requested", PLUGIN_DISMISSED_KEY, "skerry-messages-section"];
const original = keys.map((key) => localStorage.getItem(key));
window.addEventListener("beforeunload", () => keys.forEach((key, index) => {
  if (original[index] === null) localStorage.removeItem(key); else localStorage.setItem(key, original[index]!);
}));
localStorage.setItem(keys[0], "en");
localStorage.setItem(keys[1], "true");
localStorage.removeItem(PLUGIN_DISMISSED_KEY);
localStorage.removeItem("skerry-messages-section");

const now = Date.now();
const manifest = { id: "github", name: { en: "GitHub", "zh-CN": "GitHub" }, description: { en: "x", "zh-CN": "x" }, version: "0.1.0", apiVersion: 1,
  runtime: { command: "github.exe" }, permissions: ["network", "sessions", "notifications"], contributes: ["sessions", "notifications"], settings: [], actions: [] };
const snapshot = {
  registry: { developerMode: false, indexUrl: "", installed: { github: { manifest, enabled: true, directory: "", development: false, settings: {} } } },
  live: { github: { status: "running", quota: [], notifications: [
    { id: "thread-1-1", sourceId: "github", appName: "GitHub", icon: "github", title: "Review requested · acme/app", body: "Add a very long pull request title that has to be cut off somewhere sensible", receivedAt: now - 60_000, action: "open:/acme/app/pull/12" },
    { id: "fail-7", sourceId: "github", appName: "GitHub", icon: "github", title: "CI failed · main", body: "acme/app — Fix the build", receivedAt: now - 120_000, action: "open:/acme/app/actions/runs/7" },
  ], sessions: [
    { id: "run-9", title: "CI · feature/a-rather-long-branch-name-here", cwd: "acme/app", status: "running", updatedAt: now - 10_000, action: "open:/acme/app/actions/runs/9" },
    { id: "run-8", title: "Deploy · main — waiting for approval", cwd: "acme/app", status: "waiting", updatedAt: now - 20_000, action: "open:/acme/app/actions/runs/8" },
    { id: "run-7", title: "CI · main — failed", cwd: "acme/app", status: "completed", updatedAt: now - 120_000, action: null },
  ] } },
};

let revision = 1;
let systemItems = [
  { id: "s1", appId: "app-a", appDisplayName: "Slack", title: "Channel", body: "Hello", bodyLines: ["Hello"], timestamp: now, appLogo: null },
];
const calls: string[] = [];
const actions: string[] = [];
const opened: string[] = [];
mockIPC(async (command, payload) => {
  calls.push(command);
  const args = (payload ?? {}) as Record<string, unknown>;
  if (command === "get_plugins") return snapshot;
  if (command === "run_plugin_action") { actions.push(`${args.id}:${args.action}`); return { openUrl: `https://github.com${String(args.action).slice(5)}` }; }
  if (command === "plugin:opener|open_url") { opened.push(String(args.url)); return null; }
  if (command === "clear_system_notifications") { systemItems = []; revision += 1; }
  if (command === "get_system_notifications_state" || command === "set_system_notifications_enabled" || command === "request_system_notification_access" || command === "clear_system_notifications") {
    return { revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items: systemItems };
  }
  return null;
}, { shouldMockEvents: true });

function Fixture() {
  const controller = useSystemNotifications(false);
  const feed = usePluginFeed();
  return (
    <MessagesPanel
      controller={controller}
      extra={{
        count: feed.notifications.length,
        hasContent: feed.notifications.length + feed.sessions.length > 0,
        node: <PluginMessagesSection feed={feed} />,
        onClear: () => feed.dismissAll(feed.notifications),
      }}
    />
  );
}

let root = createRoot(document.getElementById("fixture")!);
const passed: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  passed.push(`PASS ${message}`);
};
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
const cards = () => [...document.querySelectorAll<HTMLElement>(".message-card")];
const rows = () => [...document.querySelectorAll<HTMLElement>(".plugin-feed__session")];
const mount = async () => { await act(async () => root.render(<StrictMode><I18nProvider><Fixture /></I18nProvider></StrictMode>)); await settle(); };
const option = (name: string) => [...document.querySelectorAll<HTMLButtonElement>(".messages-switch__option")].find((button) => button.textContent?.startsWith(name))!;
const count = (name: string) => option(name).querySelector(".messages-switch__count")?.textContent;
const show = async (name: string) => { await act(async () => option(name).click()); await settle(); };

try {
  await mount();
  check(option("System").getAttribute("aria-pressed") === "true", "With a system notification to read, the System section opens first");
  check(count("System") === "1" && count("Plugins") === "2", "Each section shows how many cards it holds");
  check(cards().length === 1 && rows().length === 0, "The System section holds only the system notification");
  await show("Plugins");
  check(option("Plugins").getAttribute("aria-pressed") === "true" && !document.body.textContent?.includes("Channel"), "The Plugins section leaves the system notifications out");
  check(cards().length === 2, "Both plugin notifications show as message cards");
  check(cards()[0].textContent?.includes("Review requested · acme/app"), "The newest notification comes first");
  check(document.querySelector(".messages-toolbar__title")?.textContent?.includes("(3)"), "The title counts the system and the plugin notifications");
  check(rows().length === 3, "The plugin's three tasks are listed");
  check(document.body.textContent?.includes("GitHub activity"), "The tasks sit under the plugin's name");
  check(rows().map((row) => row.querySelector(".plugin-feed__dot")?.className.split("--")[1]).join() === "running,waiting,completed", "Each task shows its state, newest first");
  check(!document.querySelector(".messages-empty"), "The page is not called empty");
  const list = document.querySelector<HTMLElement>(".messages-list")!;
  check(list.scrollWidth <= list.clientWidth, "Long titles do not overflow the narrow panel");

  await act(async () => cards()[0].querySelector<HTMLElement>(".message-card__surface")!.click());
  await settle();
  check(actions[actions.length - 1] === "github:open:/acme/app/pull/12" && opened[opened.length - 1] === "https://github.com/acme/app/pull/12", "Clicking a card runs its action and opens the page it names");
  await act(async () => rows()[0].click());
  await settle();
  check(opened[opened.length - 1] === "https://github.com/acme/app/actions/runs/9", "Clicking a task opens its page");
  const before = actions.length;
  await act(async () => rows()[2].click());
  check(actions.length === before && rows()[2].tagName === "DIV", "A task with no action is not clickable");

  await act(async () => cards()[0].querySelector<HTMLButtonElement>(".message-card__dismiss")!.click());
  check(cards().length === 1 && document.querySelector(".messages-toolbar__title")?.textContent?.includes("(2)"), "Dismissing a card removes it and updates the count");
  check(JSON.parse(localStorage.getItem(PLUGIN_DISMISSED_KEY) ?? "[]").join() === "github/thread-1-1", "The dismissed notification is remembered");
  await act(async () => root.unmount());
  root = createRoot(document.getElementById("fixture")!);
  await mount();
  check(option("Plugins").getAttribute("aria-pressed") === "true", "The last picked section is remembered after a restart");
  check(cards().length === 1 && cards()[0].textContent?.includes("CI failed"), "A dismissed notification stays gone after a restart");

  const clearAll = document.querySelector<HTMLButtonElement>(".messages-toolbar__action")!;
  await act(async () => clearAll.click());
  check(cards().length === 0 && !calls.includes("clear_system_notifications"), "Clear all in the Plugins section clears the plugin notifications without touching the system ones");
  check(rows().length === 3 && !document.querySelector(".messages-empty"), "The tasks stay after Clear all");
  check(!document.querySelector(".messages-toolbar__action"), "Clear all disappears when nothing is left to clear in the section");

  await show("System");
  check(cards().length === 1 && cards()[0].textContent?.includes("Channel"), "The system notification is still there");
  await act(async () => document.querySelector<HTMLButtonElement>(".messages-toolbar__action")!.click());
  await settle();
  check(calls.includes("clear_system_notifications") && Boolean(document.querySelector(".messages-empty")), "Clear all in the System section clears only the system notifications");
  await show("Plugins");
  check(rows().length === 3, "The plugin tasks stay after the system notifications are cleared");

  document.documentElement.dataset.testResult = "passed";
  document.getElementById("results")!.textContent = `${passed.join("\n")}\n\nAll ${passed.length} checks passed.`;
} catch (error) {
  document.documentElement.dataset.testResult = "failed";
  document.getElementById("results")!.textContent = `${passed.join("\n")}\nFAIL ${String(error)}`;
  console.error(error);
}
