import { useLayoutEffect, useMemo, useState } from "react";
import type { IslandSettings } from "../../features/appearance/types";
import { noticeText, type MessagePreview } from "../../features/messages/messagePreview";
import { useTranslation } from "../../i18n";
import { getNoticeSize, oneLineOverflow } from "./noticeLayout";
import { expandsPreview, noticePassesClicks, widensToFit } from "./noticeRules";
import { MESSAGE_EXPAND_MAX_WIDTH } from "../../features/appearance/settingsLimits";
import type { IslandMode } from "./types";
import type { IslandNotice } from "./useIslandWindow";

type MessageNoticeOptions = { mode: IslandMode; isTucked: boolean; quiet: boolean; collapsedIslandWidth: number };

/**
 * The adaptive message preview (Settings → Messages): the size the collapsed island grows to for
 * the preview showing, null while it fits one line or the setting is off; and what the native
 * window needs to know of it (its hit area, and passing clicks through in game mode).
 */
export function useMessageNotice(preview: MessagePreview | null, settings: IslandSettings, { mode, isTucked, quiet, collapsedIslandWidth }: MessageNoticeOptions) {
  const t = useTranslation();
  const shows = preview !== null && mode === "collapsed" && !isTucked;
  const grows = shows && expandsPreview(settings, preview.kind);
  // A short status pop-up that does not expand still widens the one-line bar to fit.
  const widens = shows && !grows && widensToFit(preview.kind);
  // The width the laid-out one-line preview turned out to need, for this preview; see measuredWidth.
  const [measured, setMeasured] = useState({ at: -1, width: 0, tries: 0 });
  const measuredWidth = preview && measured.at === preview.receivedAt ? measured.width : 0;
  const size = useMemo(() => {
    if (!preview || !(grows || widens)) return null;
    const limits = {
      maxHeight: settings.messageExpandMaxHeight,
      baseWidth: collapsedIslandWidth,
      baseHeight: settings.collapsedHeight,
      fontScale: settings.islandFontPercent / 100,
      collapsedScale: settings.collapsedScale,
      measuredWidth,
    };
    // The one-line bar shows the title and body, without the app's name.
    if (widens) return getNoticeSize({ sender: preview.title, body: preview.body }, { ...limits, maxWidth: MESSAGE_EXPAND_MAX_WIDTH.default, oneLineOnly: true });
    // Every source gets the selectable reader: the one-line bar is a button, whose text cannot be
    // selected and which opens the app on click (QQ / WeChat users wanted to copy too).
    return getNoticeSize(noticeText(preview, t.messages), { ...limits, maxWidth: settings.messageExpandMaxWidth, forceReader: true });
  }, [collapsedIslandWidth, grows, widens, measuredWidth, preview, settings.collapsedHeight, settings.collapsedScale, settings.islandFontPercent,
    settings.messageExpandMaxHeight, settings.messageExpandMaxWidth, t.messages]);
  // The estimate can fall short of the island as drawn (real glyph widths): measure the one-line
  // preview after layout and grow by what is still cut off.
  const receivedAt = preview?.receivedAt ?? null;
  const oneLine = (grows || widens) && !size?.reader;
  useLayoutEffect(() => {
    if (!oneLine || receivedAt === null) return;
    const needed = oneLinePreviewNeededWidth();
    if (needed === null) return;
    // A few rounds at most: each one grows by what is still cut off, so it settles in one or two.
    setMeasured((current) => {
      const same = current.at === receivedAt;
      if (same && current.tries >= MAX_MEASURES) return current;
      return { at: receivedAt, width: Math.max(same ? current.width : 0, needed), tries: (same ? current.tries : 0) + 1 };
    });
    // The bar's own width can change under a preview that has no size of its own yet.
  }, [oneLine, receivedAt, size?.width, collapsedIslandWidth]);
  const nativeNotice: IslandNotice = {
    width: size?.width ?? null,
    height: size?.height ?? null,
    clickThrough: noticePassesClicks(quiet, preview !== null, mode),
  };
  return { size, nativeNotice };
}

// The ellipsis appears as soon as the text is a fraction of a px too wide, dropping two or three
// characters, so any real cut-off counts. The tolerance only covers floating-point noise.
const TEXT_TOLERANCE = 0.05;
// Other clipped boxes report whole px and keep a little slack.
const BOX_TOLERANCE = 4;
// Room to spare past what was cut off.
const SPARE_WIDTH = 2;
const MAX_MEASURES = 3;

/**
 * The width the collapsed bar needs to show its one-line preview whole, in the island's own px, or
 * null while nothing is cut off. The title and the body add up, as they shrink together; among the
 * other elements in the text slot that clip, the widest one counts. A preview sliding away is left out.
 */
function oneLinePreviewNeededWidth() {
  const bar = document.querySelector<HTMLElement>(".island--collapsed .island__collapsed");
  const slot = bar?.querySelector<HTMLElement>(".island__text-slot");
  if (!bar || !slot) return null;
  // The bar is scaled by a transform: client rects include it, offsetWidth does not.
  const scale = bar.getBoundingClientRect().width / bar.offsetWidth || 1;
  const clipping = [slot, ...slot.querySelectorAll<HTMLElement>("*")]
    .filter((element) => !element.closest(".island__summary-layer--outgoing") && getComputedStyle(element).overflowX !== "visible");
  const isTextPart = (element: HTMLElement) => element.matches(".island-message-preview__sender, .island-message-preview__body");
  // scrollWidth and clientWidth are rounded to whole px and hide a fraction that still cuts the text.
  const textCutOff = (element: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const cutOff = (range.getBoundingClientRect().width - element.getBoundingClientRect().width) / scale;
    return cutOff > TEXT_TOLERANCE ? cutOff : 0;
  };
  const boxCutOff = (element: HTMLElement) => {
    const cutOff = element.scrollWidth - element.clientWidth;
    return cutOff > BOX_TOLERANCE ? cutOff : 0;
  };
  const overflow = oneLineOverflow(clipping.filter(isTextPart).map(textCutOff), clipping.filter((element) => !isTextPart(element)).map(boxCutOff));
  return overflow > 0 ? bar.offsetWidth + Math.ceil(overflow) + SPARE_WIDTH : null;
}
