import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "../../i18n";
import "./NoteImageViewer.css";

/**
 * A note's image shown large over the island (the island is the portal host, so the picture stays
 * inside its shape). A click anywhere, the close button or Escape puts it away again.
 */
export function NoteImageViewer({ url, host, onClose }: { url: string; host: Element; onClose: () => void }) {
  const t = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    // Captured on the document, so Escape closes the picture and not the island (useIslandKeyboard).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="note-image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t.notebook.noteImage}
      // A portal's events still bubble through the React tree; the island must not see them.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); onClose(); }}
    >
      <button ref={closeRef} className="note-image-viewer__close icon-button" type="button" aria-label={t.notebook.closeNoteImage} title={t.notebook.closeNoteImage}>
        <X size={16} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />
      </button>
      <img className="note-image-viewer__image" src={url} alt={t.notebook.noteImage} draggable={false} />
    </div>,
    host,
  );
}
