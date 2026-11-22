export type MusicDiagnosticsText = {
  title: string;
  dismiss: string;
  details: string;
  update: string;
  empty: string;
  openFailed: string;
  ok: string;
  needsUpdate: string;
  smtcOff: string;
  noTimeline: string;
};

export type MusicText = {
  estimatedProgress: string;
  calibrateLine: (line: string) => string;
  seekLine: (line: string) => string;
  diagnostics: MusicDiagnosticsText;
  playerLabel: string;
  controlFailed: string;
  nothingPlaying: string;
  nothingPlayingHint: string;
  resume: string;
  resumeHint: string;
  lyricsLabel: string;
  lyricsOffset: { label: string; earlier: string; later: string; reset: (seconds: number) => string };
  unknownArtist: string;
  previous: string;
  previousTrack: string;
  play: string;
  pause: string;
  next: string;
  nextTrack: string;
  progress: string;
  openSettings: string;
};

export const en: MusicText = {
  estimatedProgress: "Progress is estimated. Click a lyric line to recalibrate.",
  calibrateLine: (line) => `Recalibrate progress to: ${line}`,
  seekLine: (line) => `Seek to: ${line}`,
  diagnostics: {
    title: "Player compatibility", dismiss: "Hide", details: "Learn more", update: "Update", empty: "No players detected", openFailed: "Could not open link",
    ok: "Progress sync is working",
    needsUpdate: "Player version is outdated. Lyrics use estimated timing.",
    smtcOff: "Enable system media controls in player settings to sync progress.",
    noTimeline: "This player provides no timeline. Lyrics use estimated timing.",
  },
  playerLabel: "Music player",
  controlFailed: "Control failed",
  nothingPlaying: "Nothing playing",
  nothingPlayingHint: "Play a song in any player and it shows up here",
  resume: "Resume",
  resumeHint: "Ask the last player you used to carry on",
  lyricsLabel: "Lyrics",
  lyricsOffset: {
    label: "Lyrics timing for this song",
    earlier: "Lyrics 0.5 s earlier",
    later: "Lyrics 0.5 s later",
    reset: (seconds) => (seconds === 0 ? "Not moved" : `Moved ${Math.abs(seconds)} s ${seconds > 0 ? "later" : "earlier"}; click to reset`),
  },
  unknownArtist: "Unknown artist",
  previous: "Previous",
  previousTrack: "Previous track",
  play: "Play",
  pause: "Pause",
  next: "Next",
  nextTrack: "Next track",
  progress: "Playback progress",
  openSettings: "Lyrics settings",
};
