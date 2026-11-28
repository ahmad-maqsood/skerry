/**
 * The big weekday's letters, drawn as single strokes on a 56-unit-high grid (a stroke is 7 wide,
 * so a path runs down the middle of its line). Open corners and a low crossbar on the A give the
 * look of the clock widget; only the letters of the seven weekdays exist.
 */
export const GLYPH_HEIGHT = 56;
export const GLYPH_STROKE = 7;
const LETTER_GAP = 14;
const SPACE = 28;

type Glyph = { width: number; path: string };

const GLYPHS: Record<string, Glyph> = {
  A: { width: 40, path: "M3.5 56L20 3.5L36.5 56M10.5 40H29.5" },
  D: { width: 40, path: "M3.5 3.5H27L36.5 13V43L27 52.5H3.5Z" },
  E: { width: 40, path: "M36.5 3.5H3.5V52.5H36.5M3.5 28H30" },
  F: { width: 40, path: "M36.5 3.5H3.5V56M3.5 28H30" },
  H: { width: 40, path: "M3.5 0V56M36.5 0V56M3.5 28H36.5" },
  I: { width: 7, path: "M3.5 0V56" },
  M: { width: 40, path: "M3.5 56V3.5L20 30L36.5 3.5V56" },
  N: { width: 40, path: "M3.5 56V3.5L36.5 52.5V0" },
  O: { width: 40, path: "M3.5 3.5H36.5V52.5H3.5Z" },
  R: { width: 40, path: "M3.5 56V3.5H32.5Q36.5 3.5 36.5 8V23.5Q36.5 28 32.5 28H3.5M19 28L37 56" },
  S: { width: 40, path: "M36.5 3.5H3.5V28H36.5V52.5H3.5" },
  T: { width: 40, path: "M0 3.5H40M20 3.5V56" },
  U: { width: 40, path: "M3.5 0V52.5H36.5V0" },
  W: { width: 40, path: "M3.5 0L11.5 56L20 22L28.5 56L36.5 0" },
  Y: { width: 40, path: "M3.5 0L20 28L36.5 0M20 28V56" },
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
