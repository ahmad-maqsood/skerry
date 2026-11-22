import { X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { MessageSourceIcon } from "./MessageSourceIcon";
import { formatMessageCardTime } from "./messageCardText";
import "./MessageCard.css";

type MessageCardProps = {
  id: string;
  appId: string;
  appDisplayName: string;
  logo?: string | null;
  title: string;
  timestamp: number;
  body: string;
  onOpen?: () => void;
  onDismiss?: () => void;
};

export function MessageCard({
  id,
  appDisplayName,
  logo,
  title,
  timestamp,
  body,
  onOpen,
  onDismiss,
}: MessageCardProps) {
  const t = useTranslation();
  const date = new Date(timestamp);

  return (
    <article className="message-card" role="listitem" data-message-id={id}>
      <div
        className="message-card__surface"
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen?.();
          }
        }}
      >
        <div className="message-card__heading">
          <MessageSourceIcon logo={logo} name={appDisplayName} size={16} />
          <strong className="message-card__name">{title || appDisplayName}</strong>
          <time dateTime={Number.isFinite(date.getTime()) ? date.toISOString() : undefined}>
            {formatMessageCardTime(timestamp, Date.now(), t.messages.yesterday)}
          </time>
          {onDismiss && (
            <button
              className="message-card__dismiss"
              type="button"
              aria-label={t.messages.clearOne}
              title={t.messages.clearOne}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
        {body && <p className="message-card__body">{body}</p>}
      </div>
    </article>
  );
}
