// One page for every documentation screenshot: /tests/screenshots/scene.html?scene=<name>.
// It mounts the real island, clipboard or settings window over mocked Tauri commands that answer
// with the fictional demo data in demoData.ts, drives the UI into the state the shot needs, and
// then tells scripts/capture-screenshots.mjs where to crop (<html data-scene-ready, data-capture>).
//
//   scene = clock | notification | messages | music | todos | shelf | system | clipboard | settings
//   ?material=classic|liquidGlass|frostedGlass  ?theme=dark|light  ?wallpaper=1  ?page=<settings page>
//
// Open it under `pnpm dev` to look at a scene by eye; `pnpm screenshots` captures all of them.
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";
import "../../src/styles/tokens.css";
import "../../src/styles/fonts.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { SYSTEM_NOTIFICATIONS_CHANGED_EVENT } from "../../src/features/messages/system-notifications/api";
import { SYSTEM_UPDATE_EVENT } from "../../src/features/system-monitor/api";
import { trackIslandTopEdge } from "../../src/windows/island/topEdge";
import {
  DEMO_CLIPBOARD, DEMO_LRC, DEMO_MESSAGES, DEMO_SHELF, DEMO_SYSTEM, DEMO_TODOS,
  demoMedia, incomingToast, notificationSnapshot,
} from "./demoData";

const query = new URLSearchParams(location.search);
const scene = query.get("scene") ?? "clock";
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
document.documentElement.dataset.scene = scene;
if (query.has("wallpaper")) document.documentElement.dataset.wallpaper = "";

// The shot list fixes the clock at 10:42 AM. Time still passes (animations and timers need it);
// it is only shifted, so nothing changes the minute during the few seconds a shot takes.
const RealDate = Date;
const shifted = new RealDate();
shifted.setHours(10, 42, 0, 0);
let offset = shifted.getTime() - RealDate.now();
class DemoDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(RealDate.now() + offset);
    else super(...(args as [number]));
  }
  static now() { return RealDate.now() + offset; }
}
globalThis.Date = DemoDate as DateConstructor;
const now = Date.now();
const day = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

// Start from a clean profile, so the pictures never show what a developer's browser had saved.
for (const key of Object.keys(localStorage).filter((key) => key.startsWith("skerry-"))) localStorage.removeItem(key);
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
localStorage.setItem("skerry-current-date", day(new Date()));
localStorage.setItem("skerry-qq-notification-access-requested", "true");
localStorage.setItem("skerry-detached-settings", "true");
localStorage.setItem("skerry-clock-weather", JSON.stringify({ showClock: true, showWeather: false }));
localStorage.setItem("skerry-settings", JSON.stringify({
  pageButtonStyle: "capsule",
  autoCollapseSeconds: 0,
  autoTuck: false,
  topEdgeShoulders: true,
  topEdgeShoulderSize: 20,
  collapsedAutoWidth: true,
  lyricsOnline: true,
  todoTimerEnabled: true,
  // The incoming message grows the collapsed island to fit its text instead of cutting it short.
  messageAutoExpand: true,
  ...(query.get("material") && query.get("material") !== "classic" ? { material: query.get("material") } : {}),
  ...(query.get("theme") ? { colorScheme: query.get("theme") } : {}),
}));
const todosScene = scene === "todos";
localStorage.setItem("skerry-todos", JSON.stringify(todosScene ? DEMO_TODOS(now) : []));
if (todosScene) {
  // The second task's focus round is 25 minutes; the scene starts it (see islandScene).
  localStorage.setItem("skerry-todo-durations", JSON.stringify({ t2: 25 }));
}

Object.assign(globalThis, { isTauri: true });
const root = createRoot(document.getElementById("root")!);
const element = (selector: string) => {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
};
/** Clicks, then waits out the island's 560 ms height and radius animation. */
const click = async (selector: string, wait = 800) => { element(selector).click(); await sleep(wait); };
const rectOf = (target: Element, pad: { x?: number; top?: number; bottom?: number } = {}) => {
  const box = target.getBoundingClientRect();
  const x = pad.x ?? 0;
  const top = Math.max(0, box.top - (pad.top ?? 0));
  return { x: Math.max(0, box.left - x), y: top, width: box.width + 2 * x, height: box.bottom + (pad.bottom ?? 0) - top };
};
const ready = (capture: { x: number; y: number; width: number; height: number }) => {
  document.documentElement.dataset.capture = JSON.stringify(capture);
  document.documentElement.dataset.sceneReady = "true";
};

async function islandScene() {
  let revision = 1;
  const messages = DEMO_MESSAGES(now);
  mockIPC((command) => {
    switch (command) {
      case "plugin:app|version": return "0.1.0";
      case "get_media_state": case "media_play_pause": case "media_next": case "media_previous":
        return scene === "music" ? demoMedia(Date.now()) : { ...demoMedia(Date.now()), available: false, audioActive: false, playbackStatus: "stopped", title: "", artist: "", album: "", thumbnail: null };
      case "get_media_diagnostics": return { players: [] };
      case "get_audio_level": return { active: scene === "music", peak: 0.55, updatedAt: Date.now() };
      case "get_lyrics": return scene === "music" ? { source: "lrclib", lrc: DEMO_LRC } : null;
      case "get_clipboard_history": return DEMO_CLIPBOARD(now);
      case "get_file_shelf": return { items: DEMO_SHELF(now) };
      case "get_system_snapshot": return DEMO_SYSTEM(0);
      case "get_system_notifications_state": case "set_system_notifications_enabled":
        return notificationSnapshot(scene === "messages" ? messages : [], ++revision);
      case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
      case "get_island_top_attachment": return true;
      case "set_island_interaction": return "disabled";
      case "list_plugin_views": return { views: [], status: [] };
      case "get_launch_at_startup": return false;
      case "get_default_todo_save_directory": return "D:\\Notes";
      case "has_translation_secret": return false;
      case "updater_configured": return false;
      case "plugin:window|is_visible": return true;
      default: return null;
    }
  }, { shouldMockEvents: true });
  mockWindows("main");
  const { IslandApp } = await import("../../src/windows/island/IslandApp");
  trackIslandTopEdge();
  root.render(<StrictMode><I18nProvider><IslandApp /></I18nProvider></StrictMode>);
  await sleep(1200);

  const island = () => element(".island");
  const framed = () => rectOf(island(), { x: 28, bottom: 28 });
  if (scene === "clock") return ready(framed());
  if (scene === "notification") {
    const toast = incomingToast(Date.now());
    await emit(SYSTEM_NOTIFICATIONS_CHANGED_EVENT, { snapshot: notificationSnapshot([toast], ++revision), newestId: toast.id, windowVisible: true });
    await sleep(1500);
    return ready(framed());
  }
  await click(".island__open-button", 1000);
  const page: Record<string, string> = { messages: "messages", music: "music", todos: "todo", shelf: "shelf", system: "system" };
  await click(`.dot-button--${page[scene]}`, 1000);
  if (scene === "system") {
    // The sparkline is the last minute of samples; feed it a minute's worth.
    for (let step = 1; step <= 60; step++) await emit(SYSTEM_UPDATE_EVENT, DEMO_SYSTEM(step));
    await sleep(500);
  }
  if (scene === "music") await sleep(800);
  if (todosScene) {
    // Start the second task's 25-minute round through its timer button, as a user does. (A timer
    // saved in storage is dropped on load, so it cannot be set up that way.)
    const timerButton = document.querySelector<HTMLElement>(".todo-timer-button");
    if (!timerButton) throw new Error("Missing the timer buttons");
    timerButton.click();
    await sleep(500);
    const startedAt = Date.now();
    element(".todo-duration-picker__start").click();
    await sleep(800);
    // Starting a task folds the island back up; open it again on the task list.
    await click(".island__open-button", 1200);
    if (!document.querySelector(".todo-start--active")) await click(".dot-button--todo", 1000);
    // Wind the clock on so the badge reads 18:42 remaining (two seconds of margin for the capture).
    offset += startedAt + (25 * 60 - (18 * 60 + 42)) * 1000 + 2000 - Date.now();
    await sleep(700);
  }
  ready(framed());
}

async function clipboardScene() {
  mockWindows("clipboard");
  mockIPC((command) => {
    switch (command) {
      case "get_clipboard_history": return DEMO_CLIPBOARD(now);
      case "get_clipboard_shortcut_error": return null;
      default: return null;
    }
  }, { shouldMockEvents: true });
  const { ClipboardWindow } = await import("../../src/windows/clipboard/ClipboardWindow");
  root.render(<I18nProvider><ClipboardWindow /></I18nProvider>);
  await sleep(1200);
  ready(rectOf(element("#root"), { x: 40, top: 40, bottom: 40 }));
}

async function settingsScene() {
  await import("../regression/settingsMocks");
  const { SettingsWindow } = await import("../../src/windows/settings/SettingsWindow");
  root.render(<I18nProvider><SettingsWindow /></I18nProvider>);
  await sleep(800);
  await click(`.settings-sidebar__item[data-category='${query.get("page") ?? "appearance"}']`, 600);
  ready(rectOf(element("#root"), { x: 40, top: 40, bottom: 40 }));
}

const scenes: Record<string, () => Promise<void>> = { clipboard: clipboardScene, settings: settingsScene };
try {
  await (scenes[scene] ?? islandScene)();
} catch (error) {
  document.documentElement.dataset.sceneError = String(error);
  console.error(error);
}
