import type { IslandSettings } from "../../features/appearance/types";
import { isLevelKind, LEVEL_PREVIEW_SECONDS, type PreviewKind } from "../../features/messages/messagePreview.ts";
import type { IslandMode, IslandPage } from "./types";

type NoticeSettings = Pick<IslandSettings, "messagePreviewSeconds" | "messageAutoExpand" | "messageExpandSeconds" | "gameShowNotices" | "gameNoticeSeconds">;
type ExpandSettings = Pick<IslandSettings, "messageAutoExpand" | "messageExpandApps" | "messageExpandClipboard" | "messageExpandMusic" | "messageExpandCharger">;

/**
 * Whether a preview grows with its text (Settings → Messages → Expand long messages): the switch is
 * on and so is the one for its kind. No kind is a notification from an app, and a plugin's pop-up
 * follows the same switch; the island's own pop-ups (a copied text, a new song, the charger) each
 * have a switch of their own.
 */
export function expandsPreview(settings: ExpandSettings, kind?: PreviewKind) {
  if (!settings.messageAutoExpand) return false;
  switch (kind) {
    case "clipboard": return settings.messageExpandClipboard;
    case "music": return settings.messageExpandMusic;
    case "battery": return settings.messageExpandCharger;
    // Short device notices and level bars are one line: there is nothing to expand.
    case "bluetooth":
    case "airplane":
    case "volume":
    case "brightness": return false;
    default: return settings.messageExpandApps;
  }
}

/**
 * Short status pop-ups (the charger, a device, airplane mode) say little, so the bar always widens
 * enough to show all of it, whatever the "Expand long messages" switches say: on a narrow bar
 * "Charger plugged in · 90%" was cut to "Charger plugg… · 9…".
 */
export function widensToFit(kind?: PreviewKind) {
  return kind === "battery" || kind === "bluetooth" || kind === "airplane";
}

/** The page a click on a pop-up opens: the island's own pop-ups open a page, not an app. */
export function previewPage(kind: PreviewKind): IslandPage {
  switch (kind) {
    case "clipboard": return "clipboard";
    case "music": return "music";
    case "plugin": return "qq";
    default: return "system";
  }
}

/**
 * How long a message preview stays: game mode's own seconds while it is quiet (previews show there
 * only with gameShowNotices), the adaptive preview's while it expands (a long text takes longer to
 * read), otherwise the usual preview seconds. `expands` is whether this preview expands; it
 * defaults to the master switch. A level pop-up (volume, brightness) always stays its own short time.
 */
export function previewSecondsFor(settings: NoticeSettings, quiet: boolean, expands = settings.messageAutoExpand, kind?: PreviewKind) {
  if (isLevelKind(kind)) return LEVEL_PREVIEW_SECONDS;
  if (quiet && settings.gameShowNotices) return settings.gameNoticeSeconds;
  return expands ? settings.messageExpandSeconds : settings.messagePreviewSeconds;
}

/**
 * Whether the cursor passes through the island: while game mode is quiet and a preview shows on
 * the collapsed island, so a click meant for the game never lands on it or takes the focus.
 */
export function noticePassesClicks(quiet: boolean, hasPreview: boolean, mode: IslandMode) {
  return quiet && hasPreview && mode === "collapsed";
}

export function canPreviewNotice(settings: Pick<IslandSettings, "gameShowNotices" | "revealOnMessage">, quiet: boolean, mode: IslandMode, tucked: boolean) {
  return mode === "collapsed" && (quiet ? settings.gameShowNotices : !tucked || settings.revealOnMessage);
}
