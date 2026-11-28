/** What the native side reports about the pixels behind the widget. Mirrors Backdrop in src-tauri/src/widgets/backdrop.rs. */
export type WidgetBackdrop = {
  luminance: number;
  average: [number, number, number];
  accent: [number, number, number] | null;
};

export type WidgetInk = { color: string; shadow: string };

type Rgb = [number, number, number];

/** WCAG's contrast for ordinary text; the ink is darkened or lightened until it reaches this. */
const MIN_CONTRAST = 4.5;
const DARK: Rgb = [20, 20, 24];
const LIGHT: Rgb = [250, 250, 252];

/** Used until the first look at the desktop, and where the desktop cannot be read. */
export const FALLBACK_INK: WidgetInk = { color: "#ffffff", shadow: "0 1px 5px rgba(0, 0, 0, 0.55)" };

function linear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminanceOf([r, g, b]: Rgb) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastBetween(a: number, b: number) {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const mix = (from: Rgb, to: Rgb, amount: number): Rgb =>
  [0, 1, 2].map((index) => Math.round(from[index] + (to[index] - from[index]) * amount)) as Rgb;

const hex = (rgb: Rgb) => `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * The widget's colour for a backdrop: the screen's own accent colour (the red sun of a wallpaper)
 * pushed toward black or white only as far as it takes to read clearly, or plain black or white
 * where the screen has no accent. Whichever of black and white contrasts more decides the direction.
 */
export function pickInk(backdrop: WidgetBackdrop | null): WidgetInk {
  if (!backdrop || !finite(backdrop.luminance)) return FALLBACK_INK;
  const background = Math.min(1, Math.max(0, backdrop.luminance));
  const darkReads = contrastBetween(0, background) >= contrastBetween(1, background);
  const target = darkReads ? DARK : LIGHT;
  const accent = backdrop.accent?.length === 3 && backdrop.accent.every(finite) ? backdrop.accent : null;
  let ink: Rgb = accent ?? target;
  for (let step = 0; step <= 20 && contrastBetween(luminanceOf(ink), background) < MIN_CONTRAST; step += 1) {
    ink = mix(accent ?? target, target, step / 20);
  }
  return { color: hex(ink), shadow: shadowFor(ink) };
}

/** A dark halo under light ink and a light one under dark ink, so either keeps an edge. */
function shadowFor(ink: Rgb) {
  return luminanceOf(ink) > 0.4 ? "0 1px 5px rgba(0, 0, 0, 0.45)" : "0 1px 5px rgba(255, 255, 255, 0.35)";
}

/** The user's own colour (`#RRGGBB`), drawn exactly as picked; only the halo is chosen for it. */
export function customInk(color: string): WidgetInk {
  const rgb = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)) as Rgb;
  return { color, shadow: shadowFor(rgb) };
}
