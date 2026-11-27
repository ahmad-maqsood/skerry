/**
 * The cat as a pixel grid, facing right: `k` is fur, `e` an eye, `p` the nose, `.` nothing.
 * Every row is SPRITE_WIDTH characters wide. Walking, the body is drawn once and the two leg
 * poses swap; sitting (two tail positions), stretching and sleeping are whole pictures.
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

const SIT_HEAD_AND_BACK = [
  "..........k....k",
  "..........kk..kk",
  "..........kkkkkk",
  "..........kekkkp",
  ".........kkkkkk.",
  ".......kkkkkkk..",
] as const;
const SIT_TAIL_DOWN = [
  ...SIT_HEAD_AND_BACK,
  "......kkkkkkkk..",
  ".....kkkkkkk.k..",
  ".kkkkkkkkkkk.kk.",
] as const;
const SIT_TAIL_UP = [
  ...SIT_HEAD_AND_BACK,
  ".k....kkkkkkkk..",
  ".k...kkkkkkk.k..",
  "..kkkkkkkkkk.kk.",
] as const;
/** Front paws down, back end up. */
const STRETCH = [
  ".k..............",
  ".k..............",
  ".kkkk...........",
  ".kkkkkk...k....k",
  "..kkkkkkk.kk..kk",
  "..kk.kkkkkkkkkkk",
  "..k..kkkkkkekkkp",
  "..k...kkkkkkkkk.",
  "..k........kkkkk",
] as const;
/** Curled up, the eye shut to a line. */
const SLEEP = [
  "................",
  "................",
  "................",
  "..........k...k.",
  "....kkkkkkkk.kk.",
  "..kkkkkkkkkkkkk.",
  ".kkkkkkkkkeekkk.",
  ".kkkkkkkkkkkkkp.",
  "..kkkkkkkkkkkkk.",
] as const;
const SNORE = [
  "kk.",
  ".k.",
  ".kk",
] as const;
export const POSE_ROWS = { sitTailDown: SIT_TAIL_DOWN, sitTailUp: SIT_TAIL_UP, stretch: STRETCH, sleep: SLEEP } as const;
/** Where the open eye is, walking and sitting alike: a blink covers it with fur. */
export const BLINK_PIXEL = { x: 11, y: 3 } as const;

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
export const SIT_TAIL_DOWN_RUNS = spriteRuns(SIT_TAIL_DOWN);
export const SIT_TAIL_UP_RUNS = spriteRuns(SIT_TAIL_UP);
export const STRETCH_RUNS = spriteRuns(STRETCH);
export const SLEEP_RUNS = spriteRuns(SLEEP);
export const SNORE_RUNS = spriteRuns(SNORE);
