// The tucked looks for island-tour.tsx: tucking from the open island and coming back out.
// Line shrinks the shape itself into a 72 x 5 bar and hidden fades it out; sampled halfway, neither
// has jumped to its end, and both cover Rust's hot zone (line is the bar itself) so the page's mouseenter still reveals.
import { act } from "react";

type TuckTour = {
  tuckStyle: string;
  island: () => HTMLElement;
  check: (condition: unknown, message: string) => void;
  settle: (ms: number) => Promise<void>;
  interaction: () => Record<string, unknown>;
  click: (selector: string) => Promise<void>;
  checkShapeMotion: (expectedSeconds: number) => void;
};

/**
 * A click outside act(): inside it the island's class change starts no CSS transition in headless
 * Chrome (the tour's other checks read end values straight away), so motion sampled halfway needs this.
 */
async function clickLive(selector: string) {
  document.querySelector<HTMLElement>(selector)!.click();
  await act(async () => {});
}

/** From the open island: tuck it to the top edge, then open it again from there. */
export async function checkTuckMorph({ tuckStyle, island, check, settle, interaction, click, checkShapeMotion }: TuckTour) {
  const morphs = tuckStyle !== "edge";
  const expandedWidth = Number.parseFloat(getComputedStyle(island()).width);
  await (morphs ? clickLive : click)('[aria-label="Tuck to top edge"]');
  checkShapeMotion(0.38);
  check(interaction().isTucked === true, "Edge tuck requests position animation");
  if (!morphs) {
    check(interaction().tuckStyle === "edge" && !/island--tuck-/.test(island().className), "Tuck style edge: passed to native window; island unchanged");
    await settle(450);
    check(getComputedStyle(island().querySelector(".island__shoulders")!).opacity === "0", "Default tuck style also hides shoulders");
    await click(".island__open-button");
    return;
  }
  const scale = Number.parseFloat(getComputedStyle(island()).getPropertyValue("--island-collapsed-scale")) || 1;
  await settle(120);
  let mid = getComputedStyle(island());
  check(tuckStyle === "line"
    ? Number.parseFloat(mid.width) > 72 * scale + 2 && Number.parseFloat(mid.width) < expandedWidth - 2
    : Number.parseFloat(mid.opacity) > 0.02 && Number.parseFloat(mid.opacity) < 0.98,
  `Tuck style ${tuckStyle}: collapsing morphs continuously, not an instant switch (${mid.width} / ${mid.opacity})`);
  await settle(450);
  const style = getComputedStyle(island());
  const shoulders = island().querySelector<HTMLElement>(".island__shoulders")!;
  check(getComputedStyle(shoulders).opacity === "0", "Any tuck style leaves no shoulders when retracted");
  const endOk = tuckStyle === "line"
    ? Math.abs(Number.parseFloat(style.width) - 72 * scale) < 0.5 && Math.abs(Number.parseFloat(style.height) - 5 * scale) < 0.5
      && style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.transform === "none"
    : style.opacity === "0";
  const zone = getComputedStyle(island(), "::before");
  // Line's hot zone is the 72 x 5 bar itself (endOk above), so the cursor must be on the line to
  // reveal the island; hidden draws nothing and covers its 160 x 6 strip with ::before.
  const zoneOk = tuckStyle === "line"
    || (Math.abs(Number.parseFloat(zone.width) - 160 * scale) < 0.5 && Math.abs(Number.parseFloat(zone.height) - 6 * scale) < 0.5);
  check(interaction().tuckStyle === tuckStyle && endOk && zoneOk && island().classList.contains(`island--tuck-${tuckStyle}`),
    `Tuck style ${tuckStyle}: sent to the native window, ${tuckStyle === "line" ? "island shrinks to a short line" : "island is fully transparent"}, hit zone matches the native hot zone (${style.width}×${style.height} / ${style.opacity} / ${zone.width}×${zone.height})`);

  const samples: number[] = [island().getBoundingClientRect().top];
  const started = performance.now();
  const measured = new Promise<void>((resolve) => {
    const frame = () => {
      samples.push(island().getBoundingClientRect().top);
      if (performance.now() - started < 620) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  await clickLive(".island__open-button");
  await settle(120);
  mid = getComputedStyle(island());
  check(tuckStyle === "line"
    ? Number.parseFloat(mid.height) > 5 * scale + 2 && island().classList.contains("island--untuck-line") && mid.transform === "none"
    : Number.parseFloat(mid.opacity) > 0.02 && Number.parseFloat(mid.opacity) < 0.98 && island().classList.contains("island--untuck-hidden"),
  `Tuck style ${tuckStyle}: emerging from the edge morphs, not a flash (${mid.height} / ${mid.opacity} / ${mid.transform})`);
  await settle(600);
  await measured;
  check(samples.length >= 3 && samples.every((y, i) => i === 0 || y >= samples[i - 1] - 0.01),
    `Tuck style ${tuckStyle}: top edge never moves up frame by frame (${samples.length} frames, y=${Math.min(...samples).toFixed(2)}…${Math.max(...samples).toFixed(2)})`);
  check(!/island--untuck-/.test(island().className) && getComputedStyle(island()).opacity === "1", `Tuck style ${tuckStyle}: restores full island when emerging`);
  if (island().classList.contains("island--shoulders")) {
    const shoulderStyle = getComputedStyle(shoulders);
    const rect = shoulders.getBoundingClientRect();
    const body = island().getBoundingClientRect();
    check(shoulderStyle.opacity === "1" && shoulderStyle.pointerEvents === "none"
      && rect.left < body.left && rect.right > body.right && rect.width <= 820 && rect.left >= 0 && rect.right <= innerWidth,
    "Top-edge corners widen with the island body, stay inside the stage and do not intercept clicks");
    document.documentElement.dataset.islandTopEdge = "detached";
    await settle(650);
    check(getComputedStyle(shoulders).opacity === "0", "Hides shoulders after dragging away from top edge");
    document.documentElement.dataset.islandTopEdge = "attached";
    await settle(650);
    check(getComputedStyle(shoulders).opacity === "1", "Restores shoulders after docking back to top");
  }
}
