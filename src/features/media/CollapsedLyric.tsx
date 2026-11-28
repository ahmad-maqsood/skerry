import { useState, type CSSProperties } from "react";
import type { MediaState } from "./api";
import { songOffsetKey, wordFill, type LyricWord } from "./lyrics/lrc";
import { lyricClockAt } from "./lyrics/lyricClock";
import { useLyricClock } from "./lyrics/useLyricClock";
import { useLyrics, type LyricsSettings } from "./lyrics/useLyrics";
import { useSongOffset } from "./lyrics/useSongOffset";
import "./CollapsedLyric.css";

/** Snapshot the lyric clock on mount; CSS fills every frame without re-rendering the island. */
function CollapsedSungWords({ words, mediaState, offsetMs, playing }: {
  words: LyricWord[]; mediaState: MediaState; offsetMs: number; playing: boolean;
}) {
  const [start] = useState(() => lyricClockAt(null, mediaState, Date.now(), offsetMs).position);
  return words.map((word, index) => {
    const { delayMs, durationMs } = wordFill(word, start);
    const style = { animationDelay: `${delayMs}ms`, animationDuration: `${durationMs}ms`,
      animationPlayState: playing ? "running" : "paused" } as CSSProperties;
    return <span className="collapsed-lyric__word" key={index} style={style}>{word.text}</span>;
  });
}

/**
 * The playing song on the collapsed island: its title and artist, or the line being sung when
 * collapsed lyrics are switched on (title and artist again with no lyrics or between lines). It wakes on its own for each line, so only this leaf re-renders while a
 * song plays; a new line replaces the last at once (the music page lets it rise in).
 * Keep prefetching while expanded; only the visible leaf drives the line-change clock.
 */
export function CollapsedLyric({
  mediaState,
  lyricsSettings,
  active,
}: {
  mediaState: MediaState;
  lyricsSettings: LyricsSettings & { lyricsOffsetMs: number };
  active: boolean;
}) {
  // Looked up even with the line switched off, so it is there at once when switched on.
  const { lines: foundLines } = useLyrics(mediaState, lyricsSettings);
  const lines = lyricsSettings.lyricsOnCollapsed === true ? foundLines : null;
  const [songOffsetMs] = useSongOffset(lines ? songOffsetKey(mediaState) : null);
  const offsetMs = lyricsSettings.lyricsOffsetMs + songOffsetMs;
  const { index, playing } = useLyricClock(lines, mediaState, offsetMs, active);
  const song = [mediaState.title, mediaState.artist].filter(Boolean).join(" · ");
  const line = lines && index >= 0 ? lines[index] : null;
  const words = lyricsSettings.lyricWordFill === true && line?.text ? line.words : undefined;

  return (
    <span className="collapsed-lyric">{words ? <CollapsedSungWords
      key={`${index}:${mediaState.updatedAt}:${offsetMs}:${active}:${playing}`}
      words={words} mediaState={mediaState} offsetMs={offsetMs} playing={playing && active}
    /> : line?.text || song}</span>
  );
}
