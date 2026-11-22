// The collapsed island's shape for island-tour.tsx: the notch flush with the top edge, or with
// ?capsule=1 a pill floating below it (features/appearance/islandShape.ts).
type ShapeTour = {
  island: HTMLElement;
  expectedHeight: number;
  interaction: Record<string, unknown>;
  check: (condition: unknown, message: string) => void;
};

export function checkCollapsedShape(capsule: boolean, { island, expectedHeight, interaction, check }: ShapeTour) {
  const style = getComputedStyle(island);
  const height = island.getBoundingClientRect().height;
  const bottom = Number.parseFloat(style.borderBottomLeftRadius);
  if (!capsule) {
    check(height === expectedHeight && bottom >= 16 && style.borderTopLeftRadius === "0px",
      `Collapsed island hugs the top edge: flat top, large rounded bottom corners (${height}px / ${bottom}px / ${style.borderTopLeftRadius})`);
    return;
  }
  const top = Number.parseFloat(style.borderTopLeftRadius);
  check(height === expectedHeight && top === expectedHeight / 2 && bottom === expectedHeight / 2
    && style.getPropertyValue("--island-corner-shape").trim() === "round",
  `Collapsed capsule is a pill: every corner is half the bar height, ends are arcs (${height}px / ${top}px / ${bottom}px)`);
  check(island.classList.contains("island--capsule") && island.classList.contains("island--detached")
    && !island.classList.contains("island--shoulders"), "Capsule floats with no edge-hugging corners");
  check(interaction.marginY === 8 && interaction.collapsedCornerRadius === expectedHeight / 2,
    "Capsule hangs 8px below the top edge and the native click area is also a pill");
}
