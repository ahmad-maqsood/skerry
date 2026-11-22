import { act } from "react";
import { createRoot } from "react-dom/client";
import { emit } from "@tauri-apps/api/event";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { DEFAULT_SETTINGS } from "../../src/features/appearance/settings";
import { useIslandNotices } from "../../src/windows/island/useIslandNotices";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
let seconds = 10;
let now = 1000;
let revision = 0;
let notice!: ReturnType<typeof useIslandNotices>;
let quiet = false;
let tucked = false;
let autoExpand = false;
let gameShowNotices = false;
const calls: string[] = [];
const realNow = Date.now;
const realTimeout = window.setTimeout;
const realClear = window.clearTimeout;
const timers = new Map<number, { at: number; callback: () => void }>();
let timerId = 0;
Date.now = () => now;
window.setTimeout = ((callback: () => void, delay = 0) => {
  if (delay <= 0) return realTimeout(callback, delay);
  const id = --timerId;
  timers.set(id, { at: now + delay, callback });
  return id;
}) as typeof window.setTimeout;
window.clearTimeout = (id) => { if (id !== undefined) timers.delete(id); realClear(id); };

mockIPC((command) => {
  calls.push(command);
  if (command === "request_system_notification_access") return "Allowed";
  if (command === "get_system_notifications_state") return {
    revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items: [],
  };
  return null;
}, { shouldMockEvents: true });

function Fixture() {
  notice = useIslandNotices({ ...DEFAULT_SETTINGS, messagePreviewSeconds: seconds, messageAutoExpand: autoExpand,
    messageExpandSeconds: 12, gameShowNotices, gameNoticeSeconds: 2, revealOnMessage: false }, { mode: "collapsed", isTucked: tucked, quiet });
  return <div>{notice.systemNotifications.preview?.title}</div>;
}

const root = createRoot(document.getElementById("root")!);
const render = () => act(async () => root.render(<I18nProvider><Fixture /></I18nProvider>));
const advance = async (ms: number) => {
  now += ms;
  for (const [id, timer] of Array.from(timers.entries())) {
    if (timer.at <= now) {
      timers.delete(id);
      await act(async () => timer.callback());
    }
  }
};

const notify = async (id: number, text: string) => act(async () => {
  await emit("system-notifications-changed", {
    snapshot: {
      revision: ++revision,
      enabled: true,
      status: "listening",
      hideText: false,
      mutedApps: [],
      knownApps: [{ appId: "app", appDisplayName: "App" }],
      items: [{ id, appId: "app", appDisplayName: "App", title: "User", bodyLines: [text], timestamp: now, appLogo: null }]
    },
    newestId: id,
    windowVisible: true,
  });
});

const checks: string[] = [];
const check = (condition: unknown, label: string) => {
  if (!condition) throw new Error(label);
  checks.push(`PASS ${label}`);
};

try {
  await render();
  check(notice.preview === null, "Starts without preview");
  await notify(1, "Hello");
  check(notice.preview?.title === "User", "Notification preview arrives");
  await advance(seconds * 1000 - 500);
  check(notice.preview?.title === "User", "Preview stays visible before duration expires");
  await advance(600);
  check(notice.preview === null, "Preview expires after configured messagePreviewSeconds");

  document.getElementById("results")!.textContent = `${checks.join("\n")}\n\nAll ${checks.length} checks passed.`;
} catch (error) {
  document.getElementById("results")!.textContent = `${checks.join("\n")}\nFAIL ${String(error)}`;
  console.error(error);
} finally {
  Date.now = realNow;
  window.setTimeout = realTimeout;
  window.clearTimeout = realClear;
}
