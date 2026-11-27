/** The lyrics settings kept with the island's settings (Settings → Music). */
export type LyricsSettingValues = {
  lyricsFolder: string;
  lyricsOnline: boolean;
  lyricsOnMusicPage: boolean;
  lyricWordFill: boolean;
  lyricsOffsetMs: number;
};

export const DEFAULT_LYRICS_SETTINGS: LyricsSettingValues = {
  lyricsFolder: "",
  lyricsOnline: true,
  lyricsOnMusicPage: false,
  lyricWordFill: false,
  lyricsOffsetMs: 0,
};

export function normalizeLyricsSettings(saved: Partial<Record<keyof LyricsSettingValues, unknown>> | null | undefined): LyricsSettingValues {
  return {
    ...DEFAULT_LYRICS_SETTINGS,
    lyricsOnline: saved?.lyricsOnline !== false,
    // Off unless the user switched it on: saved data from before this setting stays off.
    lyricsOnMusicPage: saved?.lyricsOnMusicPage === true,
    lyricWordFill: false,
  };
}
