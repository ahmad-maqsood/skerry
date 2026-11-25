// Fictional demo data for the documentation screenshots. It follows docs/SCREENSHOTS.md: nothing
// here is a real person, message, project or track, so the pictures are safe to publish.
import type { ClipboardHistorySnapshot } from "../../src/features/clipboard/api";
import type { FileShelfItem } from "../../src/features/file-shelf/api";
import type { MediaState } from "../../src/features/media/api";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import type { SystemSnapshot } from "../../src/features/system-monitor/types";
import type { SystemNotification, SystemNotificationSnapshot } from "../../src/features/messages/system-notifications/types";

const MINUTE = 60_000;
const GB = 1024 ** 3;

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`)}`;

/** An original night-sky cover for the demo track; no real album art is used. */
export const DEMO_COVER = svg(
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1026"/><stop offset=".5" stop-color="#3a2a78"/><stop offset="1" stop-color="#ff7ab6"/></linearGradient></defs>' +
    '<rect width="100" height="100" fill="url(#g)"/>' +
    '<circle cx="70" cy="30" r="14" fill="#ffe9c7" opacity=".9"/>' +
    '<path d="M0 74 L22 52 L40 68 L62 44 L100 76 V100 H0Z" fill="#0b1026" opacity=".85"/>' +
    '<circle cx="18" cy="20" r="1.2" fill="#fff"/><circle cx="38" cy="12" r="1" fill="#fff"/><circle cx="52" cy="26" r="1.4" fill="#fff"/>',
);

export const DEMO_TRACK = { title: "Midnight Horizon", artist: "Aether Echoes", album: "Neon Solitude (2026)" };
/** The lyric line the music shot highlights: the player starts at 0:58 and a shot takes a few seconds, so it sits well inside this line (1:00 to 1:10). */
export const ACTIVE_LYRIC = "Tracing constellations through the frosted glass";

/** Original lyrics written for the demo track. */
export const DEMO_LRC = [
  "[00:40.00]The city hums beneath a violet sky",
  "[00:50.00]Streetlights blink in slow Morse code",
  `[01:00.00]${ACTIVE_LYRIC}`,
  "[01:10.00]Every window is a tiny sunrise",
  "[01:20.00]And we keep driving toward the glow",
].join("\n");

export function demoMedia(now: number): MediaState {
  return {
    ...DEFAULT_MEDIA_STATE,
    available: true,
    audioActive: true,
    playbackStatus: "playing",
    ...DEMO_TRACK,
    thumbnail: DEMO_COVER,
    positionMs: 58_000,
    durationMs: 214_000,
    canNext: true,
    canPrevious: true,
    sourceApp: "Spotify",
    updatedAt: now,
  };
}

const note = (id: string, app: string, sender: string, body: string, minutesAgo: number, now: number): SystemNotification => ({
  id, appId: app.toLowerCase(), appDisplayName: app, title: sender, body, bodyLines: [body], timestamp: now - minutesAgo * MINUTE, appLogo: null,
});

export const DEMO_MESSAGES = (now: number) => [
  note("n1", "Teams", "Sophia Chen", "Can you review the deployment checklist before 3 PM?", 4, now),
  note("n2", "WhatsApp", "Marcus Brody", "Files received, compiling the test binary now.", 11, now),
  note("n3", "Outlook", "Liam Vance", "Q3 Engineering Roadmap Review - Final deck attached", 19, now),
  note("n4", "GitHub", "github-actions[bot]", "Workflow CI passed on branch main", 26, now),
];

export function notificationSnapshot(items: SystemNotification[], revision: number): SystemNotificationSnapshot {
  const apps = [...new Map(items.map((item) => [item.appId, { appId: item.appId, appDisplayName: item.appDisplayName }])).values()];
  return { revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: apps, items };
}

/** The toast the collapsed-notification shot slides in. */
export const incomingToast = (now: number) =>
  note("n5", "Microsoft Outlook", "Liam Vance", "Q3 Engineering Roadmap Review - Final deck attached", 0, now);

export const DEMO_TODOS = (now: number) => [
  { id: "t1", title: "Review PR #48 - updater migration", completed: true, createdAt: now - 3 * 60 * MINUTE },
  { id: "t2", title: "Verify GitHub Actions release signing workflow", completed: false, createdAt: now - 2 * 60 * MINUTE },
  { id: "t3", title: "Document plugin SDK API interface", completed: false, createdAt: now - 60 * MINUTE },
];

export const DEMO_CLIPBOARD = (now: number): ClipboardHistorySnapshot => ({
  settings: { enabled: true, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: true },
  items: [
    ["c1", "https://github.com/ahmad-maqsood/skerry/releases", true],
    ["c2", "cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings", false],
    ["c3", '{"apiVersion": 1, "runtime": {"command": "skerry-bot.exe"}}', false],
    ["c4", 'export const API_BASE_URL = "https://api.skerry.local/v1";', false],
  ].map(([id, text, favorite], index) => ({
    id: String(id), kind: "text" as const, hash: String(id), createdAt: now - (index + 1) * 7 * MINUTE, copiedAt: now - (index + 1) * 7 * MINUTE,
    favorite: Boolean(favorite), preview: String(text), text: String(text),
  })),
});

const file = (id: string, name: string, size: number, now: number): FileShelfItem => ({
  id, name, path: `D:\\Shelf\\${name}`, isDir: false, size, addedAt: now - 2 * MINUTE, pinned: false, missing: false, unreachable: false,
});

export const DEMO_SHELF = (now: number): FileShelfItem[] => [
  file("f1", "skerry-architecture.pdf", 1.8 * 1024 * 1024, now),
  file("f2", "app-icon-mark.svg", 24 * 1024, now),
  file("f3", "benchmark-results.csv", 142 * 1024, now),
];

/** A CPU trace that wobbles around 18% so the 60-second sparkline has a believable shape. */
export const cpuAt = (step: number) => Math.round((18 + 9 * Math.sin(step / 4) + 5 * Math.sin(step / 1.7)) * 10) / 10;

export const DEMO_SYSTEM = (step: number): SystemSnapshot => ({
  cpu: { totalPercent: cpuAt(step), coreCount: 8, corePercents: [14, 22, 9, 31, 12, 18, 7, 26] },
  // A slow drift, so the memory graph reads as live instead of a ruled line.
  memory: { totalBytes: 32 * GB, usedBytes: (13.9 + 0.35 * Math.sin(step / 7) + 0.15 * Math.sin(step / 3)) * GB, percent: Math.round(((13.9 + 0.35 * Math.sin(step / 7) + 0.15 * Math.sin(step / 3)) / 32) * 100) },
  disk: {
    drives: [
      { mountPoint: "C:", name: "NVMe SSD", totalBytes: 953 * GB, availableBytes: (953 - 412) * GB, usedPercent: 43 },
      { mountPoint: "D:", name: "Data", totalBytes: 2048 * GB, availableBytes: (2048 - 1229) * GB, usedPercent: 60 },
    ],
    readBytesPerSec: 1_258_291,
    writeBytesPerSec: 348_160,
  },
  network: {
    rxBytesPerSec: 4.2 * 1024 * 1024 + 90_000 * Math.sin(step),
    txBytesPerSec: (620 + 90 * Math.sin(step / 2 + 1)) * 1024,
    totalRxBytes: 104_857_600,
    totalTxBytes: 31_457_280,
  },
  wifi: { connected: true, ssid: "Skerry-5G", signalPercent: 92, linkSpeedMbps: 866, phyType: "Wi-Fi 6 (802.11ax)", isEthernetFallback: false },
  battery: { hasBattery: true, isCharging: false, isPluggedIn: true, percent: 85, remainingSeconds: null },
  uptimeSeconds: 275_400,
});

/** The phrase typed into the translation page and the answer the mocked service gives (fictional). */
export const DEMO_TRANSLATION = {
  source: "La reunión se movió a las 3 de la tarde. Trae el informe de la semana pasada, por favor.",
  result: "The meeting has moved to 3 PM. Please bring last week's report.",
};
