/**
 * The big weekday's letters, as filled outlines on a 56-unit-high grid with 10-unit strokes. Our
 * own lettering in the style of the Mond desktop skin: bold, wide and far apart, with open joints
 * whose ends are cut at an angle, and an A without a crossbar. Only the letters of the seven
 * weekdays exist. Holes (the O) need the even-odd fill rule (ClockWidget.css).
 */
export const GLYPH_HEIGHT = 56;
const LETTER_GAP = 40;
const SPACE = 48;

type Glyph = { width: number; path: string };

const GLYPHS: Record<string, Glyph> = {
  A: { width: 50, path: "M0 56L19 0H31L50 56H39L25 14L11 56Z" },
  D: { width: 48, path: "M0 0H10V56H0ZM17 0H24C39 0 48 12 48 28S39 56 24 56H17L26 46C33.5 45 38 38 38 28S33.5 11 26 10Z" },
  E: { width: 38, path: "M0 0H38V10H9ZM0 23H34V33H10V46H38V56H0Z" },
  F: { width: 38, path: "M0 0H38V10H9ZM0 23H36V33H10V56H0Z" },
  H: { width: 44, path: "M0 0H10V56H0ZM34 0H44V56H34ZM15 23H29V33H15Z" },
  I: { width: 10, path: "M0 0L10 9V56H0Z" },
  M: { width: 54, path: "M0 56V0H11L27 28L43 0H54V56H44V19L31 42H23L10 19V56Z" },
  N: { width: 44, path: "M0 0H13L34 35V0H44V56H33L0 3ZM0 20L10 36V56H0Z" },
  O: { width: 56, path: "M28 0C43.5 0 56 12.5 56 28S43.5 56 28 56S0 43.5 0 28S12.5 0 28 0ZM28 10C18 10 10 18 10 28S18 46 28 46S46 38 46 28S38 10 28 10Z" },
  R: { width: 46, path: "M0 0H27C37.5 0 44 7 44 16.5S37.5 33 27 33H15L24 23H27C31.5 23 34 20.5 34 16.5S31.5 10 27 10H9ZM0 17L10 26V56H0ZM20 36H32L46 56H34Z" },
  S: { width: 42, path: "M42 0H16C6.5 0 0 7 0 16.5S6.5 33 16 33H27C30 33 32 35.5 32 39.5S30 46 27 46H9L0 56H27C36 56 42 49 42 39.5S36 23 27 23H16C12.5 23 10 20.5 10 16.5S12.5 10 16 10H33Z" },
  T: { width: 44, path: "M0 0H44V10H0ZM17 25L27 17V56H17Z" },
  U: { width: 44, path: "M0 0H10V33C10 41 15 46 22 46S34 41 34 33V0H44V33C44 47 35 56 22 56S0 47 0 33Z" },
  W: { width: 70, path: "M0 0H11L20 39L30 0H40L50 39L59 0H70L56 56H45L35 17L25 56H14Z" },
  Y: { width: 50, path: "M0 0H12L25 19L38 0H50L30 30H20ZM20 43L30 35V56H20Z" },
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
