import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  easeOutCubic,
  lerp,
  scrollingPoints,
  seriesRange,
  smoothPath,
  windowSeries,
  type Range,
} from "./sparklineGeometry.ts";
import "./Sparkline.css";

export type SparklineProps = {
  data: number[];
  /** Upper bound of a percentage series. Leave out for rates, which are drawn from zero to their peak. */
  max?: number;
  height?: number;
  className?: string;
  color?: string;
  /** How often new samples arrive, in ms. The line glides to each one over (at most) this long. */
  tickMs?: number;
};

const WIDTH = 100;
const SLOTS = 40;
const PADDING = 3;
/** A percentage chart never zooms in tighter than this many points, so noise is not blown up. */
const MIN_PERCENT_SPAN = 14;
const MAX_GLIDE_MS = 1100;
const GUIDES = [0.33, 0.66];

export function Sparkline({
  data,
  max,
  height = 28,
  className = "",
  color,
  tickMs = 1000,
}: SparklineProps): ReactNode {
  const uid = useId();
  const gradientId = `${uid}-fill`;
  const clipId = `${uid}-clip`;
  const linePath = useRef<SVGPathElement>(null);
  const fillPath = useRef<SVGPathElement>(null);
  const dotGroup = useRef<SVGGElement>(null);
  const shown = useRef<{ values: number[]; range: Range } | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const next = windowSeries(data, SLOTS);
    const nextRange = seriesRange(next, max, MIN_PERCENT_SPAN);
    const from = shown.current ?? { values: next, range: nextRange };

    const draw = (t: number) => {
      const range = { lo: lerp(from.range.lo, nextRange.lo, t), hi: lerp(from.range.hi, nextRange.hi, t) };
      const points = scrollingPoints(from.values, next, t, WIDTH, height, PADDING, range);
      const line = smoothPath(points);
      const tip = points[points.length - 1];
      linePath.current?.setAttribute("d", line);
      fillPath.current?.setAttribute("d", `${line} L ${WIDTH},${height} L ${points[0].x.toFixed(2)},${height} Z`);
      // The dot is a zero-length round-capped stroke, so it stays a circle however the chart is stretched.
      dotGroup.current?.querySelectorAll("path").forEach((dot) => {
        dot.setAttribute("d", `M ${tip.x.toFixed(2)},${tip.y.toFixed(2)} h0`);
      });
    };

    cancelAnimationFrame(frame.current);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const duration = Math.min(Math.max(tickMs, 250), MAX_GLIDE_MS);
    if (reduceMotion || shown.current === null) {
      draw(1);
      shown.current = { values: next, range: nextRange };
      return;
    }

    const started = performance.now();
    let lastPaint = 0;
    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      // ~30 fps is plenty for a 28px chart and keeps the monitor itself cheap.
      if (t >= 1 || now - lastPaint >= 32) {
        draw(easeOutCubic(t));
        lastPaint = now;
      }
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    shown.current = { values: next, range: nextRange };
    return () => cancelAnimationFrame(frame.current);
  }, [data, max, height, tickMs]);

  return (
    <svg
      className={`system-sparkline ${className}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ ...(color ? { color } : null), height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="-2" width={WIDTH} height={height + 4} />
        </clipPath>
      </defs>
      {GUIDES.map((ratio) => (
        <line
          key={ratio}
          className="system-sparkline__guide"
          x1="0"
          x2={WIDTH}
          y1={height * ratio}
          y2={height * ratio}
        />
      ))}
      <g clipPath={`url(#${clipId})`}>
        <path ref={fillPath} className="system-sparkline__fill" fill={`url(#${gradientId})`} />
        <path ref={linePath} className="system-sparkline__path" />
      </g>
      <g ref={dotGroup}>
        <path className="system-sparkline__halo" />
        <path className="system-sparkline__dot" />
      </g>
    </svg>
  );
}
