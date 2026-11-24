/** Pure geometry for the system sparklines: windowing, auto-scaling and smooth curves. */

export type Point = { x: number; y: number };

/** The newest `slots` samples, left-padded with the oldest value so a young history still fills the chart. */
export function windowSeries(data: readonly number[], slots: number): number[] {
  const count = Math.max(2, Math.floor(slots));
  if (data.length === 0) return new Array<number>(count).fill(0);
  const tail = data.length > count ? data.slice(data.length - count) : [...data];
  const pad = new Array<number>(count - tail.length).fill(tail[0]);
  return [...pad, ...tail];
}

export type Range = { lo: number; hi: number };

/**
 * The value range a series is drawn against.
 * - With `ceiling` (a percentage), the range hugs the data but never gets thinner than `minSpan`,
 *   so a steady 49% still shows its small wobbles instead of a flat line.
 * - Without it (network rates), the range runs from zero to the peak.
 */
export function seriesRange(values: readonly number[], ceiling: number | undefined, minSpan: number): Range {
  const peak = Math.max(...values, 0);
  if (ceiling === undefined) return { lo: 0, hi: Math.max(peak, 1) };
  const low = Math.min(...values, ceiling);
  const span = Math.max(peak - low, minSpan);
  const middle = (peak + low) / 2;
  let lo = middle - span / 2;
  let hi = middle + span / 2;
  if (lo < 0) {
    hi -= lo;
    lo = 0;
  }
  if (hi > ceiling) {
    lo = Math.max(0, lo - (hi - ceiling));
    hi = ceiling;
  }
  return { lo, hi: Math.max(hi, lo + 1) };
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** Maps a value to a y coordinate inside `height`, keeping `padding` clear at the top and bottom. */
export function valueToY(value: number, range: Range, height: number, padding: number): number {
  const span = Math.max(range.hi - range.lo, 1e-9);
  const ratio = Math.min(Math.max((value - range.lo) / span, 0), 1);
  return height - padding - ratio * (height - padding * 2);
}

/**
 * A smooth path through the points: a monotone cubic (Fritsch–Carlson), so the curve flows
 * through every sample without overshooting above a peak or below a dip.
 */
export function smoothPath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  const fmt = (p: Point) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  if (n === 1) return `M ${fmt(points[0])}`;
  if (n === 2) return `M ${fmt(points[0])} L ${fmt(points[1])}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const run = points[i + 1].x - points[i].x || 1e-9;
    dx.push(run);
    slope.push((points[i + 1].y - points[i].y) / run);
  }

  const tangent: number[] = new Array<number>(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const size = Math.hypot(a, b);
    if (size > 3) {
      const scale = 3 / size;
      tangent[i] = scale * a * slope[i];
      tangent[i + 1] = scale * b * slope[i];
    }
  }

  let path = `M ${fmt(points[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    const c1 = { x: points[i].x + third, y: points[i].y + tangent[i] * third };
    const c2 = { x: points[i + 1].x - third, y: points[i + 1].y - tangent[i + 1] * third };
    path += ` C ${fmt(c1)} ${fmt(c2)} ${fmt(points[i + 1])}`;
  }
  return path;
}

/**
 * The points of a chart part-way (`t` from 0 to 1) through sliding one sample to the left.
 * `previous` and `next` are equal-length windows; the line scrolls while the newest point
 * rises or falls to its new value at the right edge.
 */
export function scrollingPoints(
  previous: readonly number[],
  next: readonly number[],
  t: number,
  width: number,
  height: number,
  padding: number,
  range: Range,
): Point[] {
  const slots = next.length;
  const step = width / (slots - 1);
  const points: Point[] = [{ x: t === 0 ? 0 : -t * step, y: valueToY(previous[0], range, height, padding) }];
  for (let i = 0; i < slots - 1; i++) {
    points.push({ x: (i + 1 - t) * step, y: valueToY(next[i], range, height, padding) });
  }
  const tip = lerp(next[slots - 2], next[slots - 1], t);
  points.push({ x: width, y: valueToY(tip, range, height, padding) });
  return points;
}
