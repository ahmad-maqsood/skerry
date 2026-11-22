import type { MediaDiagnosticStatus, PlayerDiagnostic } from "./api";
import type { MusicDiagnosticsText } from "../../i18n/sections/music";

/** One notice per player and problem: the dismissed list is keyed by this. */
export function diagnosticIdentity(player: PlayerDiagnostic): string {
  return `${player.sourceAppId}:${player.status}`;
}

export function diagnosticMessageKey(status: MediaDiagnosticStatus): keyof MusicDiagnosticsText | null {
  switch (status) {
    case "noTimeline":
      return "noTimeline";
    case "needsUpdate":
      return "needsUpdate";
    case "smtcOff":
      return "smtcOff";
    case "ok":
    default:
      return null;
  }
}
