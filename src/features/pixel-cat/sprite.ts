/**
 * The cat as a pixel grid, facing right: `k` is fur, `e` an eye, `p` the nose, `.` nothing.
 * Every row is SPRITE_WIDTH characters wide; the body is drawn once and the two leg poses swap
 * while it walks.
 */
export const SPRITE_WIDTH = 16;
export const SPRITE_HEIGHT = 9;

const BODY = [
  "..........k....k",
  ".k........kk..kk",
  ".k........kkkkkk",
  ".k........kekkkp",
  ".kkkkkkkkkkkkkk.",
  "..kkkkkkkkkkkkk.",
  "...kkkkkkkkkkk..",
] as const;
const LEGS_STRIDE = [
  "..k.k.......k.k.",
  "..k.k.......k.k.",
] as const;
const LEGS_TOGETHER = [
  "...kk........kk.",
  "...k.........k..",
] as const;

export type PixelKind = "fur" | "eye" | "nose";
/** `width` pixels of one kind in a row, starting at column `x`. */
export type PixelRun = { x: number; y: number; width: number; kind: PixelKind };

const KINDS: Record<string, PixelKind | undefined> = { k: "fur", e: "eye", p: "nose" };

/** The rows as horizontal runs of one kind, from row `firstRow` down: the fewest rects to draw. */
export function spriteRuns(rows: readonly string[], firstRow = 0): PixelRun[] {
  const runs: PixelRun[] = [];
  rows.forEach((row, index) => {
    let current: PixelRun | null = null;
    for (const [x, char] of [...row].entries()) {
      const kind = KINDS[char];
      if (current && kind === current.kind && current.x + current.width === x) {
        current.width += 1;
        continue;
      }
      current = kind ? { x, y: firstRow + index, width: 1, kind } : null;
      if (current) runs.push(current);
    }
  });
  return runs;
}

export const BODY_RUNS = spriteRuns(BODY);
export const STRIDE_RUNS = spriteRuns(LEGS_STRIDE, BODY.length);
export const TOGETHER_RUNS = spriteRuns(LEGS_TOGETHER, BODY.length);
export const SPRITE_ROWS = [...BODY, ...LEGS_STRIDE, ...LEGS_TOGETHER] as const;
