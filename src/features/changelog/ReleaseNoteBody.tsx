import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseNoteBlocks, type InlinePart } from "./releaseText";

/** A link in a description. In the app the system browser opens it. */
function NoteLink({ href, children, onFailed }: { href: string; children: string; onFailed: () => void }) {
  const open = async (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!isTauri()) return;
    event.preventDefault();
    try {
      await openUrl(event.currentTarget.href);
    } catch (error) {
      console.error("Failed to open release link", error);
      onFailed();
    }
  };
  return (
    <a className="changelog-note__link" href={href} target="_blank" rel="noopener noreferrer" onClick={(event) => void open(event)}>
      {children}
    </a>
  );
}

function Inline({ parts, onFailed }: { parts: InlinePart[]; onFailed: () => void }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.kind === "code") return <code key={index} className="changelog-note__code">{part.text}</code>;
        if (part.kind === "link") return <NoteLink key={index} href={part.href} onFailed={onFailed}>{part.text}</NoteLink>;
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

/** A release description drawn from its Markdown as React elements, never as raw HTML. */
export function ReleaseNoteBody({ markdown, openFailed }: { markdown: string; openFailed: string }) {
  const [failed, setFailed] = useState(false);
  const blocks = parseNoteBlocks(markdown);
  const onFailed = () => setFailed(true);

  return (
    <div className="changelog-note">
      {blocks.map((block, index) => {
        if (block.kind === "heading") return <h3 key={index} className="changelog-note__heading"><Inline parts={block.parts} onFailed={onFailed} /></h3>;
        if (block.kind === "list") {
          return (
            <ul key={index} className="changelog-note__list">
              {block.items.map((item, itemIndex) => <li key={itemIndex}><Inline parts={item} onFailed={onFailed} /></li>)}
            </ul>
          );
        }
        if (block.kind === "code") return <pre key={index} className="changelog-note__pre">{block.text}</pre>;
        return <p key={index} className="changelog-note__paragraph"><Inline parts={block.parts} onFailed={onFailed} /></p>;
      })}
      {failed && <p className="changelog-note__error" role="alert">{openFailed}</p>}
    </div>
  );
}
