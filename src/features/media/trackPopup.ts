import type { MediaState } from "./api";

/** Identifies the song in `state`, or null when nothing is playing that has a name. */
export function playingTrackKey(state: Pick<MediaState, "playbackStatus" | "title" | "artist" | "trackId">): string | null {
  if (state.playbackStatus !== "playing" || !state.title) return null;
  return state.trackId || `${state.title}\u0000${state.artist ?? ""}`;
}

/**
 * Whether a song just started: it is playing and is not the one last seen. `lastKey` is the last
 * song that played (kept through a pause, so resuming it does not count), null when none has yet,
 * and undefined before the first look, which only notes what is there.
 */
export function isNewTrack(lastKey: string | null | undefined, key: string | null): boolean {
  return key !== null && lastKey !== undefined && key !== lastKey;
}
