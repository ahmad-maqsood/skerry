import "../../src/styles/tokens.css";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { CollapsedLyric } from "../../src/features/media/CollapsedLyric";
import type { MediaState } from "../../src/features/media/api";
import { DEFAULT_MEDIA_STATE } from "../../src/features/media/mediaState";
import { I18nProvider } from "../../src/i18n";
import { LyricsView } from "../../src/features/media/lyrics/LyricsView";
import { parseLrc } from "../../src/features/media/lyrics/lrc";
import { normalizeSettings } from "../../src/features/appearance/settings";

const preview = new URLSearchParams(location.search).has("preview");
Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: !preview });
const root = createRoot(document.getElementById("fixture")!);
const results = document.getElementById("results")!;
const passed: string[] = [];
const lrc = "[00:01.00]<00:01.00>Word-by-<00:03.00><00:04.00>word fill<00:08.00>\n[00:09.00]Plain lyrics";
const queries: Array<Record<string, unknown>> = [];
mockIPC((command, payload) => {
  if (command !== "get_lyrics") return null;
  const query = (payload as { query: Record<string, unknown> }).query;
  queries.push(query);
  return { source: "qqmusic", lrc };
});
const base: MediaState = { ...DEFAULT_MEDIA_STATE, title: "Word test", artist: "Singer", available: true,
  sourceApp: "QQMusic.exe", trackId: "QQ-97773", playbackStatus: "paused", positionMs: 2000, durationMs: 60_000, updatedAt: Date.now() };

async function render(state: Partial<MediaState> = {}, active = true, fill = true, offset = 0) {
  await act(async () => {
    root.render(<StrictMode><CollapsedLyric active={active} mediaState={{ ...base, ...state }}
      lyricsSettings={{ lyricsFolder: "", lyricsOnline: true, lyricsOffsetMs: offset, lyricWordFill: fill }} /></StrictMode>);
  });
}
const words = () => [...document.querySelectorAll<HTMLElement>(".collapsed-lyric__word")];
const text = () => document.querySelector<HTMLElement>(".collapsed-lyric")!;
const tick = () => act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
function check(ok: unknown, label: string) {
  if (!ok) throw new Error(label);
  passed.push(`PASS ${label}`);
}

if (preview) {
  root.render(<CollapsedLyric active mediaState={{ ...base, playbackStatus: "playing", positionMs: 1000, updatedAt: Date.now() }}
    lyricsSettings={{ lyricsFolder: "", lyricsOnline: true, lyricWordFill: true, lyricsOffsetMs: 0 }} />);
  results.remove();
} else try {
  await render(); await tick();
  check(words().length === 2 && text().textContent === "Word-by-word fill", "Word-by-word label preserves original text without extra measurement text or duplicated content");
  check(queries[0].sourceAppId === "QQMusic.exe" && queries[0].trackId === "QQ-97773", "Passes song ID and player AUMID to native lyric source");
  check(words()[0].style.animationDelay === "-1000ms" && words()[0].style.animationDuration === "2000ms", "When paused mid-word, fills from corresponding ratio");
  check(words().every((word) => getComputedStyle(word).animationPlayState === "paused"), "Does not continue filling while paused");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  check(getComputedStyle(words()[0]).animationTimingFunction === (reduced ? "steps(1, start)" : "linear"), "Lights up word by word under reduced motion; smooth fill in normal mode");
  const paused = Number.parseFloat(getComputedStyle(words()[0]).backgroundPositionX);
  check(reduced ? paused === 0 : Math.abs(paused - 50) < 1, "Text gradient position corresponds to mid-word timestamp");

  await render({ positionMs: 1500, updatedAt: Date.now() }); await tick();
  check(words()[0].style.animationDelay === "-500ms", "Seek within same line immediately rebuilds animation origin");
  await render({ positionMs: 2000, updatedAt: Date.now() }, true, true, 500);
  check(words()[0].style.animationDelay === "-500ms", "Lyric calibration shifts word-by-word timing in tandem");

  await render({ positionMs: 1000, updatedAt: Date.now(), playbackStatus: "playing" }); await tick();
  const word = words()[0]; const box = text().getBoundingClientRect();
  const before = Number.parseFloat(getComputedStyle(word).backgroundPositionX);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });
  const after = Number.parseFloat(getComputedStyle(word).backgroundPositionX);
  check(reduced || after < before, "Fill advances with browser animation frames during playback");
  check(word === words()[0] && text().getBoundingClientRect().width === box.width && text().getBoundingClientRect().height === box.height,
    "DOM and layout size stay unchanged during the fill");
  await render({ positionMs: 2000, playbackStatus: "playing" }, false);
  check(words().every((word) => word.style.animationPlayState === "paused"), "Halts fill when collapsed lyrics are invisible");
  await render({ positionMs: 2000, updatedAt: Date.now() }, true, false);
  check(words().length === 0 && text().textContent === "Word-by-word fill", "Displays original line-level text when setting is disabled");
  await render({ positionMs: 9500, updatedAt: Date.now() });
  check(words().length === 0 && text().textContent === "Plain lyrics", "Still displays normal lyrics when word-by-word data is absent");
  await render({ trackId: "QQ-new", positionMs: 2000 });
  check(queries.some((query) => query.trackId === "QQ-new" && query.wordFill === true)
    && queries.some((query) => query.trackId === "QQ-97773" && query.wordFill === false), "A changed track ID or word-fill switch triggers the matching query");
  await act(async () => root.render(<I18nProvider><LyricsView lines={parseLrc(lrc)} mediaState={{ ...base, updatedAt: Date.now() }} offsetMs={0} wordFillEnabled /></I18nProvider>));
  const expanded = document.querySelector<HTMLElement>(".lyrics-view__word");
  check(Boolean(expanded) && Math.abs(Number.parseFloat(getComputedStyle(expanded!).backgroundPositionX) - (reduced ? 0 : 50)) < 1,
    "Expanded word-by-word lyrics fill the current word to its middle");
  check(!normalizeSettings({ lyricWordFill: false }).lyricWordFill && !normalizeSettings({}).lyricWordFill && !normalizeSettings({ lyricWordFill: true }).lyricWordFill,
    "Word fill stays off in saved settings: no remaining lyric source provides word timings");
  results.dataset.result = "passed"; results.textContent = passed.join("\n");
} catch (error) {
  results.dataset.result = "failed"; results.textContent = `${passed.join("\n")}\nFAIL ${String(error)}`;
} finally {
  if (!preview) await act(async () => root.unmount());
}
