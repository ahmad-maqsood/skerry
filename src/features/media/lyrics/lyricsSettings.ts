/** The lyrics settings kept with the island's settings (Settings → Music). */
export type LyricsSettingValues = {
  lyricsFolder: string;
  lyricsOnline: boolean;
  lyricWordFill: boolean;
  lyricsOffsetMs: number;
};

export const DEFAULT_LYRICS_SETTINGS: LyricsSettingValues = {
  lyricsFolder: "",
  lyricsOnline: true,
  lyricWordFill: false,
  lyricsOffsetMs: 0,
};

export function normalizeLyricsSettings(saved: Partial<Record<keyof LyricsSettingValues, unknown>> | null | undefined): LyricsSettingValues {
  return {
    ...DEFAULT_LYRICS_SETTINGS,
    lyricsOnline: saved?.lyricsOnline !== false,
    lyricWordFill: false,
  };
}
