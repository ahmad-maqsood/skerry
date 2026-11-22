import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { MusicShortcutAction, MusicShortcuts } from "./shortcuts";

// Corresponds to ShortcutErrors and STATUS_EVENT in media_control/hotkeys.rs.
export type MediaShortcutErrors = Partial<Record<MusicShortcutAction, string>>;
export const MEDIA_SHORTCUT_STATUS_EVENT = "media-shortcut-status";
export function setMediaShortcuts(enabled: boolean, shortcuts: MusicShortcuts, target?: string) {
  return invoke<void>("set_media_shortcuts", { enabled, shortcuts, target });
}
export function getMediaShortcutErrors() {
  return invoke<MediaShortcutErrors>("get_media_shortcut_errors");
}
export function listenMediaShortcutStatus(handler: (errors: MediaShortcutErrors) => void) {
  return listen<MediaShortcutErrors>(MEDIA_SHORTCUT_STATUS_EVENT, (event) => handler(event.payload));
}

// Corresponds to MediaState, MediaSessionInfo, and AudioLevel in src-tauri/src/media_control/service.rs.
export type MediaPlaybackStatus = "unavailable" | "playing" | "paused";

export type MediaRepeatMode = "none" | "track" | "list" | "unknown";

export type MediaSessionInfo = {
  id: string;
  label: string;
  playing: boolean;
};

export type MediaState = {
  available: boolean;
  audioActive: boolean;
  audioPeak: number;
  playbackStatus: MediaPlaybackStatus;
  title: string | null;
  artist: string | null;
  album: string | null;
  thumbnail: string | null;
  trackId?: string | null;
  positionMs: number;
  durationMs: number;
  hasTimeline?: boolean;
  canSeek: boolean;
  canNext: boolean;
  canPrevious: boolean;
  shuffleActive: boolean | null;
  canShuffle: boolean;
  repeatMode: MediaRepeatMode;
  canRepeat: boolean;
  volume: number;
  sourceApp: string | null;
  activeSessionId: string | null;
  sessions: MediaSessionInfo[];
  updatedAt: number;
};

export type AudioLevel = {
  active: boolean;
  peak: number;
  updatedAt: number;
};

export type MediaCommand = "media_play_pause" | "media_next" | "media_previous";

export function getMediaState(target: string | undefined) {
  return invoke<MediaState>("get_media_state", { target });
}

export function sendMediaCommand(command: MediaCommand, target: string | undefined) {
  return invoke<MediaState>(command, { target });
}

export function getAudioLevel() {
  return invoke<AudioLevel>("get_audio_level");
}

export function seekMedia(positionMs: number, target: string | undefined) {
  return invoke<MediaState>("media_seek", { positionMs: Math.max(0, Math.round(positionMs)), target });
}

export const MEDIA_SESSION_CHANGED_EVENT = "media-session-changed";

export function listenMediaSessionChanged(handler: () => void) {
  return listen(MEDIA_SESSION_CHANGED_EVENT, handler);
}

export type MediaDiagnosticStatus = "ok" | "noTimeline" | "needsUpdate" | "smtcOff";
export type PlayerDiagnostic = {
  sourceAppId: string;
  label: string;
  hasSession: boolean;
  hasTimeline: boolean;
  hasPluginTrackId: boolean;
  exePath: string | null;
  directory: string | null;
  version: string | null;
  status: MediaDiagnosticStatus;
  neteasePluginState?: null;
};
export type MediaDiagnostics = { players: PlayerDiagnostic[] };
export function getMediaDiagnostics() {
  return invoke<MediaDiagnostics>("get_media_diagnostics");
}
