/**
 * Puts `insert` into the text where the selection is, with a space before it when it would touch
 * a word and a space after it for the writing that follows. Says where the caret goes.
 */
export function insertInline(value: string, start: number, end: number, insert: string) {
  const length = value.length;
  const from = Math.min(Math.max(Math.min(start, end), 0), length);
  const to = Math.min(Math.max(Math.max(start, end), 0), length);
  const before = value.slice(0, from);
  const after = value.slice(to);
  const lead = before === "" || /\s$/.test(before) ? "" : " ";
  // A space after it for the writing that follows, unless one is already there.
  const trail = /^[^\S\n]/.test(after) ? "" : " ";

  return {
    value: `${before}${lead}${insert}${trail}${after}`,
    caret: from + lead.length + insert.length + trail.length,
  };
}

/** The time of day as the language writes it: 14:05, or 2:05 PM. */
export function formatNoteTime(date: Date, localeTag: string) {
  return new Intl.DateTimeFormat(localeTag, { hour: "numeric", minute: "2-digit" }).format(date);
}
