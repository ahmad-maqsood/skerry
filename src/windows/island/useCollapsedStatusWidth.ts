import { useLayoutEffect, useState } from "react";
import { centredClockBarWidth } from "./clockPlacement";
import { MAX_COLLAPSED_ISLAND_WIDTH } from "./layout";

/**
 * Measure status siblings only, leaving a small readable text area at manual widths too. While the
 * bar wants its clock centred (data-clock-wanted), also the room that takes; the clock is centred
 * (data-clock-centred) only once the bar is that wide, so it never covers anything.
 */
export function useCollapsedStatusWidth(enabled: boolean, fontScale: number) {
  const [minimum, setMinimum] = useState(0);
  useLayoutEffect(() => {
    if (!enabled) return;
    const bar = document.querySelector<HTMLElement>(".island__collapsed:not(.island__collapsed--notice)");
    if (!bar) return;
    let frame = 0;
    const measure = () => {
      const children = [...bar.children].filter((node): node is HTMLElement => node instanceof HTMLElement);
      const status = children.filter((node) => !node.classList.contains("island__text-slot"));
      const style = getComputedStyle(bar);
      const widths = status.reduce((total, node) => {
        const item = getComputedStyle(node);
        return total + node.offsetWidth + parseFloat(item.marginLeft || "0") + parseFloat(item.marginRight || "0");
      }, 0);
      const gap = parseFloat(style.columnGap || "0");
      let width = Math.ceil(widths + Math.max(0, children.length - 1) * gap
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 64 * fontScale);
      const centred = centredWidth(bar, children, gap, parseFloat(style.paddingLeft));
      const fits = centred !== null && centred <= MAX_COLLAPSED_ISLAND_WIDTH;
      if (fits) width = Math.max(width, centred);
      bar.toggleAttribute("data-clock-centred", fits && bar.offsetWidth >= centred);
      setMinimum((previous) => previous === width ? previous : width);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const sizes = new ResizeObserver(schedule);
    const observe = () => {
      sizes.disconnect();
      for (const child of bar.children) if (!child.classList.contains("island__text-slot")) sizes.observe(child);
      schedule();
    };
    const children = new MutationObserver(observe);
    children.observe(bar, { childList: true });
    observe();
    // The bar widens after this measurement; look again once it has.
    const barSize = new ResizeObserver(schedule);
    barSize.observe(bar);
    return () => { cancelAnimationFrame(frame); sizes.disconnect(); barSize.disconnect(); children.disconnect(); };
  });
  return enabled ? minimum : 0;
}

/** What a centred clock needs of this bar, or null while the bar does not want one. */
function centredWidth(bar: HTMLElement, children: HTMLElement[], gap: number, padding: number) {
  const clock = bar.querySelector<HTMLElement>(":scope > .collapsed-clock-wrapper");
  if (!clock || !bar.hasAttribute("data-clock-wanted")) return null;
  const others = children.filter((node) => node !== clock);
  const textAt = others.findIndex((node) => node.classList.contains("island__text-slot"));
  const side = (nodes: HTMLElement[]) => nodes.reduce((total, node, index) => {
    const style = getComputedStyle(node);
    const own = node.classList.contains("island__text-slot") ? textWidth(bar, node)
      : node.offsetWidth + parseFloat(style.marginLeft || "0") + parseFloat(style.marginRight || "0");
    return total + own + (index > 0 ? gap : 0);
  }, 0);
  const split = textAt < 0 ? 0 : textAt + 1;
  return centredClockBarWidth({ left: side(others.slice(0, split)), right: side(others.slice(split)), clock: clock.offsetWidth, padding, gap });
}

/** The width of what the text slot draws; its own box stretches across all the room left. */
function textWidth(bar: HTMLElement, slot: HTMLElement) {
  // Client rects include the bar's scale transform; the widths here are before it.
  const scale = bar.getBoundingClientRect().width / bar.offsetWidth || 1;
  const parts = slot.querySelectorAll(".island__summary-layer:not(.island__summary-layer--outgoing) > .island__summary-row > *");
  const range = document.createRange();
  const text = [...parts].reduce((total, part, index) => {
    range.selectNodeContents(part);
    return total + range.getBoundingClientRect().width / scale + (index > 0 ? 8 : 0);
  }, 0);
  const extras = slot.querySelectorAll<HTMLElement>(".island__open-button > :not(.island__summary)");
  return [...extras].reduce((total, node) => total + node.offsetWidth + 8, text);
}
