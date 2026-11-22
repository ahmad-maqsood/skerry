// Mock data for island-tour.tsx: every page of the island with believable content, so the
// tour shows what a user sees day to day rather than empty panels.
import type { ClipboardHistorySnapshot } from "../../src/features/clipboard/api";
import type { FileShelfItem } from "../../src/features/file-shelf/api";
import type { MediaState } from "../../src/features/media/api";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";

const now = Date.now();
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`)}`;

/** A cover with a warm gradient and a few shapes, so blur and tint have something to work with. */
export const COVER = svg(
  '<defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#f6b26b"/><stop offset=".55" stop-color="#c2557a"/><stop offset="1" stop-color="#3b3a7a"/></linearGradient></defs>' +
    '<rect width="100" height="100" fill="url(#g)"/><circle cx="68" cy="34" r="20" fill="#ffe2a8" opacity=".85"/><path d="M0 78 Q30 58 55 76 T100 70 V100 H0Z" fill="#231942" opacity=".7"/>',
);

export type TourMedia = "playing" | "paused" | "nocover" | "long" | "nolyrics" | "none";

const LONG_TITLE = "This Is a Very Long Song Title That Keeps Going (Live at the Royal Albert Hall, 2019 Remaster)";

export function tourMediaState(kind: TourMedia): MediaState {
  if (kind === "none") return { ...DEFAULT_MEDIA_STATE, updatedAt: now };
  return {
    ...DEFAULT_MEDIA_STATE,
    available: true,
    audioActive: kind !== "paused",
    playbackStatus: kind === "paused" ? "paused" : "playing",
    title: kind === "long" ? LONG_TITLE : kind === "nolyrics" ? "Song Without Lyrics" : "Yesterday",
    artist: kind === "long" ? "The Extraordinarily Long-Named Orchestra and Friends" : "The Beatles",
    album: "Help!",
    thumbnail: kind === "nocover" ? null : COVER,
    positionMs: 62_000,
    durationMs: 269_000,
    canNext: true,
    canPrevious: true,
    sourceApp: "Spotify",
    updatedAt: Date.now(),
  };
}

export const TOUR_LRC = [
  "[00:50.00]Yesterday",
  "[00:55.00]All my troubles seemed so far away",
  "[01:00.00]Now it looks as though they're here to stay",
  "[01:05.00]Oh, I believe in yesterday",
  "[01:10.00]Suddenly",
  "[01:15.00]I'm not half the man I used to be",
].join("\n");

export const TOUR_CLIPBOARD: ClipboardHistorySnapshot = {
  settings: { enabled: true, captureImages: true, maxItems: 100, shortcut: "Ctrl+Shift+V", shortcutEnabled: true },
  items: [
    { id: "c1", kind: "text", hash: "1", createdAt: now - 60_000, copiedAt: now - 60_000, preview: "pnpm tauri build --no-bundle", text: "pnpm tauri build --no-bundle" },
    { id: "c2", kind: "text", hash: "2", createdAt: now - 600_000, copiedAt: now - 600_000, favorite: true, note: "Tax ID", preview: "US Company LLC 12-3456789", text: "US Company LLC 12-3456789" },
    { id: "c3", kind: "text", hash: "3", createdAt: now - 3_600_000, copiedAt: now - 3_600_000, preview: "https://github.com/tauri-apps/tauri/issues/12345#issuecomment-2222222222-a-very-long-url-that-does-not-fit", text: "https://github.com/tauri-apps/tauri/issues/12345" },
    { id: "c4", kind: "text", hash: "4", createdAt: now - 7_200_000, copiedAt: now - 7_200_000, preview: "The quick brown fox jumps over the lazy dog", text: "The quick brown fox jumps over the lazy dog" },
  ],
};

const file = (id: string, name: string, extra: Partial<FileShelfItem> = {}): FileShelfItem => ({
  id, name, path: `D:\\Shelf\\${name}`, isDir: false, size: 1_468_006, addedAt: now - 120_000, pinned: false, missing: false, unreachable: false, ...extra,
});

export const TOUR_SHELF: FileShelfItem[] = [
  file("pdf", "quarterly_report.pdf", { pinned: true }),
  file("photo", "screenshot 2026-11-10.png", { size: 284_112 }),
  file("folder", "project_docs", { isDir: true, size: 0 }),
];

export const TOUR_TODOS = [
  { id: "t1", title: "Redesign music player panel", completed: false, createdAt: now - 3_600_000 },
  { id: "t2", title: "Reply to design review email", completed: false, createdAt: now - 3_000_000 },
  { id: "t3", title: "Run full regression test suite", completed: true, createdAt: now - 2_000_000 },
];
