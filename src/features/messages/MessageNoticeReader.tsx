import type { PointerEventHandler } from "react";
import { Minus } from "lucide-react";
import { useTranslation } from "../../i18n";
import { MessageSourceIcon } from "./MessageSourceIcon";
import { noticeText, type MessagePreview } from "./messagePreview";
import "./MessageNoticeReader.css";

type DragHandlers = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

export function MessageNoticeReader({
  preview,
  scrolls,
  drag,
  minimizeLabel,
  onMinimize,
}: {
  preview: MessagePreview;
  scrolls: boolean;
  drag: DragHandlers;
  /** Names the minimize button: it tucks the island to the tray or the top edge, per the user's setting. */
  minimizeLabel: string;
  /** Null hides the minimize button ("always display island"). */
  onMinimize: (() => void) | null;
}) {
  const t = useTranslation();
  const { sender, body } = noticeText(preview, t.messages);
  const appName = preview.appDisplayName || preview.appId || "App";

  return (
    <div
      className="message-notice"
      role="status"
      aria-live="polite"
      aria-label={t.messages.noticeReader(sender)}
    >
      <div className="message-notice__header">
        <span className="message-notice__drag" {...drag}>
          <MessageSourceIcon logo={preview.appLogo} name={appName} size={16} kind={preview.kind} />
        </span>
        <strong className="message-notice__sender">{sender}</strong>
        {onMinimize && (
          <button
            className="message-notice__minimize"
            type="button"
            aria-label={minimizeLabel}
            title={minimizeLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onMinimize();
            }}
          >
            <Minus size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />
          </button>
        )}
      </div>
      <div
        className={`message-notice__body${scrolls ? " message-notice__body--scrolls" : ""}`}
        data-window-drag="false"
        tabIndex={0}
      >
        {body}
      </div>
    </div>
  );
}
