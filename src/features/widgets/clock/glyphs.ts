/**
 * The big weekday's letters, drawn as single strokes on a 56-unit-high grid (a stroke is 6 wide,
 * so a path runs down the middle of its line). Our own lettering in the style of the Mond desktop
 * skin: wide apart and geometric, with cuts where a stem would meet a bar and an A without a
 * crossbar. Only the letters of the seven weekdays exist.
 */
export const GLYPH_HEIGHT = 56;
export const GLYPH_STROKE = 6;
const LETTER_GAP = 32;
const SPACE = 40;

type Glyph = { width: number; path: string };

const GLYPHS: Record<string, Glyph> = {
  A: { width: 48, path: "M3 56L24 4L45 56" },
  D: { width: 42, path: "M3 0V56M15 3H21C32 3 39 14 39 28S32 53 21 53H15" },
  E: { width: 36, path: "M0 3H36M3 15V53H36M14 28H33" },
  F: { width: 36, path: "M0 3H36M3 56V28H33" },
  H: { width: 40, path: "M3 0V56M37 0V56M13 28H27" },
  I: { width: 6, path: "M3 0V56" },
  M: { width: 50, path: "M3 56V5L25 38L47 5V56" },
  N: { width: 42, path: "M3 16V56M3 3L39 53V0" },
  O: { width: 56, path: "M3 28a25 25 0 1 0 50 0a25 25 0 1 0 -50 0" },
  R: { width: 40, path: "M3 14V56M0 3H24C32 3 37 8 37 15.5S32 28 24 28H14M21 28L37 56" },
  S: { width: 38, path: "M36 3H15C8 3 3 8 3 15.5S8 28 15 28H23C30 28 35 33 35 40.5S30 53 23 53H0" },
  T: { width: 42, path: "M0 3H42M21 15V56" },
  U: { width: 42, path: "M3 0V35C3 46 11 53 21 53S39 46 39 35V0" },
  W: { width: 64, path: "M3 0L18 52L32 6L46 52L61 0" },
  Y: { width: 44, path: "M3 0L22 29L41 0M22 38V56" },
};

export type PlacedGlyph = { x: number; path: string };

/** The word's letters with their left edges, and the word's total width in grid units. */
export function layoutWord(word: string): { width: number; glyphs: PlacedGlyph[] } {
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  for (const letter of word.toUpperCase()) {
    if (letter === " ") {
      x += SPACE;
      continue;
    }
    const glyph = GLYPHS[letter];
    if (!glyph) continue;
    glyphs.push({ x, path: glyph.path });
    x += glyph.width + LETTER_GAP;
  }
  return { width: Math.max(0, x - LETTER_GAP), glyphs };
}

export function hasGlyph(letter: string) {
  return letter.toUpperCase() in GLYPHS;
}
