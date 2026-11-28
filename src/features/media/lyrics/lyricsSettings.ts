/** The lyrics settings kept with the island's settings (Settings → Music). */
export type LyricsSettingValues = {
  lyricsFolder: string;
  lyricsOnline: boolean;
  lyricsOnMusicPage: boolean;
  lyricsOnCollapsed: boolean;
  lyricWordFill: boolean;
  lyricsOffsetMs: number;
};

export const DEFAULT_LYRICS_SETTINGS: LyricsSettingValues = {
  lyricsFolder: "",
  lyricsOnline: true,
  lyricsOnMusicPage: true,
  lyricsOnCollapsed: false,
  lyricWordFill: false,
  lyricsOffsetMs: 0,
};

export function normalizeLyricsSettings(saved: Partial<Record<keyof LyricsSettingValues, unknown>> | null | undefined): LyricsSettingValues {
  return {
    ...DEFAULT_LYRICS_SETTINGS,
    lyricsOnline: saved?.lyricsOnline !== false,
    // Data saved without lyricsOnCollapsed is from when the music page was off by default, and
    // every save wrote that default out: it takes the new default once.
    lyricsOnMusicPage: saved?.lyricsOnCollapsed === undefined || saved.lyricsOnMusicPage !== false,
    lyricsOnCollapsed: saved?.lyricsOnCollapsed === true,
    lyricWordFill: false,
  };
}
