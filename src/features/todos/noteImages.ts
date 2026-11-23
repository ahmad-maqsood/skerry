/** What a paste gives a text field: the clipboard's text and its files. */
export type PastedData = {
  getData(format: string): string;
  items: ArrayLike<{ kind: string; type: string; getAsFile(): Blob | null }>;
};

/**
 * The image in a paste, or null. A paste that also carries text (a copy from a web page or a
 * document brings both) stays a text paste; a screenshot or a copied image has no text.
 */
export function pastedImage(data: PastedData | null): Blob | null {
  if (!data || data.getData("text/plain")) return null;

  for (let index = 0; index < data.items.length; index += 1) {
    const item = data.items[index];
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}

/** How a note refers to an image saved next to its markdown file (`assets/<name>`). */
export function noteImageMarkdown(relativePath: string) {
  return `![image](${relativePath})`;
}

/** The saved images a note refers to, in order, each once. */
export function findNoteImagePaths(note: string): string[] {
  const paths: string[] = [];
  for (const match of note.matchAll(/!\[[^\]]*\]\((assets\/[A-Za-z0-9._-]+)\)/g)) {
    if (!paths.includes(match[1])) paths.push(match[1]);
  }
  return paths;
}

/**
 * Puts `insert` on a line of its own where the selection is, and says where the caret goes: after it,
 * on the line below so that writing carries on there.
 */
export function insertAtSelection(value: string, start: number, end: number, insert: string) {
  const length = value.length;
  const from = Math.min(Math.max(Math.min(start, end), 0), length);
  const to = Math.min(Math.max(Math.max(start, end), 0), length);
  const before = value.slice(0, from);
  const after = value.slice(to);
  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const trail = after.startsWith("\n") ? "" : "\n";

  return {
    value: `${before}${lead}${insert}${trail}${after}`,
    caret: from + lead.length + insert.length + trail.length,
  };
}
