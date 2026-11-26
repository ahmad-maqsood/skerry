// pnpm dev, then open /tests/collapsed-message-animation.html?test=1.
import { act, useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import { emit } from "@tauri-apps/api/event";
import "../../src/windows/island/IslandApp";
import { IslandShell } from "../../src/windows/island/IslandShell";
import { useSystemNotifications } from "../../src/features/messages/system-notifications/useSystemNotifications";
import type { NoticeSize } from "../../src/windows/island/noticeLayout";
import type { IslandMode } from "../../src/windows/island/types";
import type { MediaState } from "../../src/features/media/api";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const automated = new URLSearchParams(location.search).has("test");
const UNAVAILABLE_MEDIA: MediaState = {
  available: false, audioActive: false, audioPeak: 0, playbackStatus: "unavailable",
  title: null, artist: null, album: null, thumbnail: null, positionMs: 0, durationMs: 0,
  canSeek: false, canNext: false, canPrevious: false, shuffleActive: null, canShuffle: false,
  repeatMode: "unknown", canRepeat: false, volume: -1, sourceApp: null, activeSessionId: null,
  sessions: [], updatedAt: 0,
};
async function update(action: () => void | Promise<void>) {
  if (automated) await act(action);
  else await action();
}
const keys = ["skerry-system-notifications-enabled", "skerry-system-notification-access-requested"];
const originals = keys.map((key) => localStorage.getItem(key));
keys.forEach((key) => localStorage.removeItem(key));
function restoreStorage() {
  keys.forEach((key, index) => originals[index] === null ? localStorage.removeItem(key) : localStorage.setItem(key, originals[index]!));
}
window.addEventListener("beforeunload", restoreStorage);

let revision = 0;
const commands: string[] = [];

mockIPC((command, payload) => {
  commands.push(command);
  const args = (payload ?? {}) as Record<string, unknown>;
  if (command === "request_system_notification_access") return "Allowed";
  if (command === "get_system_notifications_state") return {
    revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [], items: [],
  };
  if (command === "set_system_notifications_enabled") return {
    revision: ++revision, enabled: args.enabled, status: "listening", hideText: false, mutedApps: [], knownApps: [], items: [],
  };
  if (command === "open_notification_app") {
    return true;
  }
  return null;
}, { shouldMockEvents: true });


function Fixture() {
  const [mode, setMode] = useState<IslandMode>("collapsed");
  const [notice] = useState<NoticeSize | null>(null);
  const sys = useSystemNotifications(mode === "collapsed");

  return (
    <div className="stage" style={{ "--collapsed-island-width": `${notice?.width ?? 280}px`, ...(notice ? { "--collapsed-island-height": `${notice.height}px` } : {}) } as CSSProperties}>
      <IslandShell
        systemNotifications={sys}
        preview={sys.preview}
        notice={notice}
        mode={mode}
        page="todo"
        expandedHeight={306}
        isTucked={false}
        tuckStyle="edge"
        topEdgeShoulders={false}
        positionLocked={false}
        isDetached={true}
        showTitle={true}
        showCollapsedText={true}
        collapsedTaskTitle="Todo task"
        collapsedTodoCount={null}
        collapsedItem="todo"
        collapsedLayout={["pulse", "text", "shelf", "music"]}
        collapsedCover={null}
        lyricsSettings={{ lyricsFolder: "", lyricsOnline: false, lyricsOffsetMs: 0 }}
        pageOrder={["todo", "music", "clipboard", "shelf"]}
        onPageOrderChange={() => {}}
        pageButtonStyle="capsule"
        material="graphite"
        nativeGlassState="disabled"
        mediaState={UNAVAILABLE_MEDIA}
        features={{ todo: true, music: true, clipboard: true, shelf: true, qq: true, translation: false, system: false }}
        shelfCount={null}
        onOpenPage={() => {}}
        onExpand={() => {}}
        onOpenMessages={() => {}}
        onPageChange={() => {}}
        onWindowDragStart={() => {}}
        onCollapse={() => setMode("collapsed")}
        onResetPosition={() => {}}
        minimizesToTray
        onMinimize={() => {}}
        onOpenSettings={() => {}}
        onOpenTranslator={() => {}}
        onReveal={() => {}}
      >
        <span>Todo list</span>
      </IslandShell>
    </div>
  );
}

async function notify(app: string, title: string, text: string) {
  await update(async () => {
    await emit("system-notifications-changed", {
      snapshot: {
        revision: ++revision,
        enabled: true,
        status: "listening",
        hideText: false,
        mutedApps: [],
        knownApps: [{ appId: app, appDisplayName: app }],
        items: [{ id: String(revision), appId: app, appDisplayName: app, title, body: text, bodyLines: [text], timestamp: Date.now(), appLogo: null }],
      },
      newestId: String(revision),
      windowVisible: true,
    });
  });
}

const root = createRoot(document.getElementById("fixture")!);
const render = () => update(() => root.render(<Fixture />));
const checks: string[] = [];
const check = (condition: unknown, label: string) => {
  if (!condition) throw new Error(label);
  checks.push(`PASS ${label}`);
};

try {
  await render();
  check(document.querySelector(".island__collapsed") !== null, "Collapsed bar mounted");
  await notify("WhatsApp", "Alice", "See you at 3pm");
  const preview = document.querySelector(".island-message-preview");
  check(preview !== null, "Notification preview displays on collapsed island");
  check(preview?.textContent?.includes("Alice") || preview?.textContent?.includes("WhatsApp"), "Preview contains sender or app name");

  document.getElementById("results")!.textContent = `${checks.join("\n")}\n\nAll ${checks.length} checks passed.`;
} catch (error) {
  document.getElementById("results")!.textContent = `${checks.join("\n")}\nFAIL ${String(error)}`;
  console.error(error);
}
