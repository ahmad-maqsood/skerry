import { useState } from "react";
import { CircleAlert, X } from "lucide-react";
import type { PlayerDiagnostic } from "./api";
import { useTranslation } from "../../i18n";
import { diagnosticIdentity, diagnosticMessageKey } from "./diagnosticStatus";
import { loadMediaDiagnosticsDismissed, saveMediaDiagnosticsDismissed } from "./storage";
import "./MediaNotice.css";

export function useMediaNotice(diagnostic: PlayerDiagnostic | undefined) {
  const player = diagnostic && diagnostic.status !== "ok" ? diagnostic : undefined;
  const identity = player ? diagnosticIdentity(player) : null;
  const [dismissed, setDismissed] = useState(loadMediaDiagnosticsDismissed);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = identity !== null && (openFor === identity || !dismissed.includes(identity));
  const close = () => {
    if (!identity) return;
    const next = [...new Set([...loadMediaDiagnosticsDismissed(), identity])];
    saveMediaDiagnosticsDismissed(next);
    setDismissed(next);
    setOpenFor(null);
  };
  return { player, open, close, toggle: () => (open ? close() : setOpenFor(identity)) };
}

export function MediaNoticeButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const label = useTranslation().music.diagnostics.title;
  return (
    <button
      className="music-icon-button media-notice-button"
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={open}
      onClick={onClick}
    >
      <CircleAlert size={16} strokeWidth={1.5} absoluteStrokeWidth />
    </button>
  );
}

export function MediaNotice({ player, onClose }: { player: PlayerDiagnostic; onClose: () => void }) {
  const text = useTranslation().music.diagnostics;
  const key = diagnosticMessageKey(player.status);
  const message = key ? text[key] : "";
  return (
    <aside className="media-notice" aria-label={text.title}>
      <div className="media-notice__head">
        <CircleAlert className="media-notice__icon" size={15} strokeWidth={1.75} aria-hidden="true" />
        <span className="media-notice__message">{message}</span>
        <button type="button" className="media-notice__close" aria-label={text.dismiss} title={text.dismiss} onClick={onClose}>
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
