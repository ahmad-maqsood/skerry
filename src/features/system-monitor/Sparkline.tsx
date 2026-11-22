import { useId, type ReactNode } from "react";
import "./Sparkline.css";

export type SparklineProps = {
  data: number[];
  max?: number;
  height?: number;
  className?: string;
  color?: string;
};

export function Sparkline({
  data,
  max,
  height = 28,
  className = "",
  color,
}: SparklineProps): ReactNode {
  const gradientId = useId();
  const points = data.length > 0 ? data : [0];
  const maxVal = max !== undefined ? Math.max(max, 1) : Math.max(...points, 1);
  const width = 100;
  const h = height;
  const padding = 2;
  const availableH = h - padding * 2;

  const count = Math.max(points.length, 2);
  const coords = points.map((val, idx) => {
    const x = (idx / (count - 1)) * width;
    const clamped = Math.min(Math.max(val, 0), maxVal);
    const y = h - padding - (clamped / maxVal) * availableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${coords.join(" L ")}`;
  const firstX = coords[0].split(",")[0];
  const lastX = coords[coords.length - 1].split(",")[0];
  const areaPath = `${linePath} L ${lastX},${h} L ${firstX},${h} Z`;

  return (
    <svg
      className={`system-sparkline ${className}`}
      viewBox={`0 0 ${width} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={color ? { color } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path className="system-sparkline__fill" d={areaPath} fill={`url(#${gradientId})`} />
      <path className="system-sparkline__path" d={linePath} />
    </svg>
  );
}
