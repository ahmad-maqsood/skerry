/** One piece of a line of release text. */
export type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

/** A release description as blocks: only what the generated and hand-written notes use. */
export type NoteBlock =
  | { kind: "heading"; parts: InlinePart[] }
  | { kind: "paragraph"; parts: InlinePart[] }
  | { kind: "list"; items: InlinePart[][] }
  | { kind: "code"; text: string };

const WHATS_NEW = /^##\s+what[’']?s new\s*$/i;
const DOWNLOADS = /^##\s+downloads\s*$/i;
const LEVEL_TWO = /^##\s/;

/**
 * The part of a release description that says what changed. Generated descriptions hold it under
 * "What's new", before the installer table and the checksum how-to, which the app has no use for.
 * A description without that heading is kept whole, minus a Downloads section.
 */
export function releaseHighlights(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => WHATS_NEW.test(line.trim()));
  if (start >= 0) {
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => LEVEL_TWO.test(line));
    return (end >= 0 ? rest.slice(0, end) : rest).join("\n").trim();
  }
  const downloads = lines.findIndex((line) => DOWNLOADS.test(line.trim()));
  return (downloads >= 0 ? lines.slice(0, downloads) : lines).join("\n").trim();
}

/** Only web links are shown as links; anything else stays plain text. */
function isWebUrl(href: string) {
  try {
    const { protocol } = new URL(href);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Bold, inline code and links of one line; everything else is text. */
export function parseInline(line: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    if (match.index > last) parts.push({ kind: "text", text: line.slice(last, match.index) });
    if (match[1] !== undefined) parts.push({ kind: "bold", text: match[1] });
    else if (match[2] !== undefined) parts.push({ kind: "code", text: match[2] });
    else {
      // A link's text may hold code ([`abc123`](url)); it shows as the plain text.
      const text = match[3].replace(/`/g, "");
      parts.push(isWebUrl(match[4]) ? { kind: "link", text, href: match[4] } : { kind: "text", text });
    }
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push({ kind: "text", text: line.slice(last) });
  return parts;
}

const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/;
const HEADING = /^#{1,6}\s+(.*)$/;
const FENCE = /^```/;

/** Markdown text as blocks: headings, paragraphs, lists and fenced code. Tables and HTML are not read. */
export function parseNoteBlocks(markdown: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: InlinePart[][] | null = null;
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: "paragraph", parts: parseInline(paragraph.join(" ")) });
    if (list) blocks.push({ kind: "list", items: list });
    paragraph = [];
    list = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (FENCE.test(line.trim())) {
      flush();
      const code: string[] = [];
      for (index++; index < lines.length && !FENCE.test(lines[index].trim()); index++) code.push(lines[index]);
      blocks.push({ kind: "code", text: code.join("\n") });
      continue;
    }
    if (line.trim() === "") { flush(); continue; }
    const heading = HEADING.exec(line.trim());
    if (heading) { flush(); blocks.push({ kind: "heading", parts: parseInline(heading[1]) }); continue; }
    const item = LIST_ITEM.exec(line);
    if (item) {
      if (paragraph.length > 0) { blocks.push({ kind: "paragraph", parts: parseInline(paragraph.join(" ")) }); paragraph = []; }
      (list ??= []).push(parseInline(item[1]));
      continue;
    }
    if (list) flush();
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

/** True when the release tag ("v1.2.0") is the installed version ("1.2.0"). */
export function isInstalledTag(tag: string, version: string): boolean {
  const clean = (text: string) => text.trim().replace(/^v/i, "");
  return version.trim() !== "" && clean(tag) === clean(version);
}
