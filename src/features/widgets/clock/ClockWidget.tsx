import type { CSSProperties } from "react";
// The date and time's rounded face (OFL, licenses/Quicksand-OFL.txt), bundled so it works offline.
import "@fontsource/quicksand/latin-500.css";
import { useTranslation } from "../../../i18n";
import { useWidgetInk } from "../useWidgetInk";
import { GLYPH_HEIGHT, GLYPH_STROKE, layoutWord } from "./glyphs";
import { useClockLines } from "./useClockLines";
import { useClockColor } from "./useClockColor";
import { customInk } from "./ink";
import "./ClockWidget.css";

/** How much larger than a grid unit the weekday is drawn, in pixels per unit. */
const WEEKDAY_SCALE = 0.92;

/**
 * The desktop clock: the weekday in big open letters, the date and the time under it, in one
 * colour that follows what is behind it or that the user picked (Settings → Advanced → Widgets). The whole window is the drag handle, so everything
 * inside lets clicks through to it.
 */
export function ClockWidget() {
  const names = useTranslation().settings.widgets.clockNames;
  const lines = useClockLines(names);
  const { settings: colorSettings } = useClockColor();
  const isCustom = colorSettings.mode === "custom";
  const followed = useWidgetInk(!isCustom);
  const ink = isCustom ? customInk(colorSettings.color) : followed;
  const word = layoutWord(lines.weekday);
  const style = { "--widget-ink": ink.color, "--widget-shadow": ink.shadow } as CSSProperties;

  return (
    <div className={isCustom ? "widget-clock widget-clock--custom" : "widget-clock"} data-tauri-drag-region style={style} role="img" aria-label={`${lines.weekday} ${lines.date} ${lines.time}`}>
      <svg
        className="widget-clock__weekday"
        viewBox={`0 0 ${Math.max(word.width, 1)} ${GLYPH_HEIGHT}`}
        style={{ width: word.width * WEEKDAY_SCALE }}
        aria-hidden="true"
      >
        {word.glyphs.map((glyph, index) => (
          <path key={index} d={glyph.path} transform={`translate(${glyph.x} 0)`} strokeWidth={GLYPH_STROKE} />
        ))}
      </svg>
      <div className="widget-clock__date">{lines.date}</div>
      <div className="widget-clock__time">- {lines.time} -</div>
    </div>
  );
}
