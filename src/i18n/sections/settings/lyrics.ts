export type SettingsLyricsText = {
  title: string;
  hint: string;
  onMusicPage: string;
  onMusicPageHint: string;
  online: string;
  onlineHint: string;
  wordFill: string;
};

export const en: SettingsLyricsText = {
  wordFill: "Word-by-word lyric fill",
  title: "Lyrics",
  hint: "When synced lyrics are found, they scroll along with the song. A song whose lyrics run out of step can be moved on its own on the music page.",
  onMusicPage: "Show lyrics on the music page",
  onMusicPageHint: "Off, the music page shows the cover and the song. On, the lyrics scroll along under the title. The collapsed island's lyric line is not affected.",
  online: "Find lyrics online",
  onlineHint: "Asks LRCLIB (lrclib.net, a free and open lyrics library), sending the title, artist, album and length. Each song is asked about once and the answer is kept on this computer.",
};
