import { glassBackdropTintAlpha, glassTintAlpha, hexToRgba } from "../../features/appearance/settings";
import type { ColorPalette } from "../../features/appearance/colorPalette";
import type { IslandSettings } from "../../features/appearance/types";

/**
 * The glass materials' variables (IslandGlass.css). Both are CSS only: the island window is a
 * transparent stage much larger than the island, so a native blur would blur the whole stage.
 * With the live blurred backdrop under it (useGlassCapture.ts) the pane takes the lighter
 * `--glass-backdrop-tint-color` instead of the tint.
 * Liquid glass is a nearly clear pane, so most of its look is the lit rim; frosted glass is a
 * milky or smoky pane that hides most of what is behind it. The strength setting makes liquid
 * glass clearer with brighter edges, and frosted glass a little clearer.
 * Prism is clear like liquid glass (a lit rim, a pointer light) and adds an iridescent film
 * and a split-colour rim; aurora is a smoky pane like frosted glass with its own drifting colour.
 * `--glass-colour-alpha` is how strong that colour is (the aurora glow, the prism film), and
 * `--glass-rim-alpha` the strength of their gradient rims.
 */
export function getGlassStyle(settings: IslandSettings, colors: ColorPalette) {
  const strength = settings.glassIntensity / 100;
  const opacity = settings.opacity / 100;
  const { material } = settings;
  // The nearly clear panes (liquid glass, prism): their look is the lit rim and the pointer light.
  const clear = material === "liquidGlass" || material === "prism";
  const coloured = material === "aurora" || material === "prism";
  const tint = hexToRgba(colors.islandBackgroundColor, opacity * glassTintAlpha(settings.material, settings.glassIntensity));
  return {
    "--glass-intensity": strength,
    "--glass-tint-color": tint,
    "--glass-collapsed-tint-color": tint,
    "--glass-backdrop-tint-color": hexToRgba(colors.islandBackgroundColor, opacity * glassBackdropTintAlpha(settings.material, settings.glassIntensity)),
    "--glass-shadow-alpha": 0.14 + strength * 0.1,
    "--glass-sheen-alpha": clear ? 0.06 + strength * 0.1 : 0.05,
    "--glass-border-alpha": clear ? 0.22 + strength * 0.3 : 0.14 + strength * 0.08,
    "--glass-inset-alpha": clear ? 0.3 + strength * 0.4 : 0.22 + strength * 0.12,
    "--glass-inner-glow-alpha": clear ? 0.05 + strength * 0.1 : 0,
    "--glass-glow-alpha": 0.08 + strength * 0.1,
    "--glass-accent-alpha": strength * 0.08,
    "--glass-highlight-opacity": 0.34 + strength * 0.5,
    "--glass-grain-opacity": clear ? 0.05 + strength * 0.03 : 0.035,
    "--glass-panel-accent-alpha": strength * 0.085,
    "--glass-colour-alpha": coloured ? (material === "aurora" ? 0.42 + strength * 0.3 : 0.18 + strength * 0.18) : 0,
    "--glass-rim-alpha": coloured ? 0.62 + strength * 0.38 : 0,
  };
}
