import type { CSSProperties } from "react";
import type { MediaState } from "./api";
import { useArtworkTint } from "./useArtworkTint";
import { tintOnLight } from "./artworkTint";
import "./MusicBackdrop.css";

/**
 * The playing song's light behind the whole open island on the music page: the cover blurred into a slowly drifting glow, and two washes of its accent.
 * It is a layer of the island's surface, not of the page, so it runs under the header too and only the island's own rounded outline cuts it. Inside the
 * page it ended at the page's rectangle, which read as a sharp-edged box. Nothing playing draws nothing.
 */
export function MusicBackdrop({ mediaState }: { mediaState: MediaState }) {
  const tint = useArtworkTint(mediaState.thumbnail);
  if (!mediaState.title) return null;
  const className = mediaState.playbackStatus === "playing" ? "music-backdrop music-backdrop--playing" : "music-backdrop";
  const style = (tint ? { "--music-tint": tint, "--music-tint-light": tintOnLight(tint) } : undefined) as CSSProperties | undefined;

  return (
    <div className={className} style={style} aria-hidden="true">
      {mediaState.thumbnail && <img src={mediaState.thumbnail} alt="" draggable={false} />}
    </div>
  );
}
