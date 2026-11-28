import { useEffect, useState, type ReactNode } from "react";
import { LevelPopupContent } from "./LevelPopupContent";
import { MessageSourceIcon } from "./MessageSourceIcon";
import { messagePreviewText, type MessagePreview } from "./messagePreview";
import { useTranslation } from "../../i18n";
import "./CollapsedMessageContent.css";

type ContentTransition = {
  key: string;
  current: MessagePreview | null;
  previous: MessagePreview | null | undefined;
  version: number;
  animated: boolean;
  previousAnimated: boolean;
};

function MessageContent({ preview }: { preview: MessagePreview }) {
  if (preview.level !== undefined) return <LevelPopupContent preview={preview} />;
  return (
    <>
      <MessageSourceIcon logo={preview.appLogo} name={preview.appDisplayName} size={16} kind={preview.kind} />
      <span className="island-message-preview__text" data-kind={preview.kind}>
        <strong className="island-message-preview__sender">
          {preview.title.trim() || preview.appDisplayName || "App"}
        </strong>
        {preview.body.trim() && (
          <>
            <span className="island-message-preview__separator" aria-hidden="true">
              ·
            </span>
            <span className="island-message-preview__body">{preview.body.trim()}</span>
          </>
        )}
      </span>
    </>
  );
}

export function CollapsedMessageContent({
  preview,
  enabled,
  holdIdle = false,
  children,
}: {
  preview: MessagePreview | null;
  enabled: boolean;
  /**
   * Keep the idle content (lyrics, title, todo) out while a pop-up slides away, and bring it in
   * once this turns false. Without it the idle content slid in under the leaving pop-up, a flash
   * of the ordinary island before it had settled.
   */
  holdIdle?: boolean;
  children: ReactNode;
}) {
  const t = useTranslation();
  const current = enabled ? preview : null;
  // A level pop-up keeps one key while its bar moves (each change is a fresh preview with a new
  // receivedAt), so the bar slides in place instead of the whole pop-up entering again.
  const key = current
    ? JSON.stringify(current.level !== undefined ? [current.id] : [current.id, current.receivedAt, current.title, current.body])
    : "idle";
  const [transition, setTransition] = useState<ContentTransition>({
    key,
    current,
    previous: undefined,
    version: 0,
    animated: false,
    previousAnimated: false,
  });

  if (
    key !== transition.key ||
    (!enabled && (transition.previous !== undefined || transition.animated))
  ) {
    setTransition({
      key,
      current,
      previous: enabled ? transition.current : undefined,
      version: transition.version + 1,
      animated: enabled,
      previousAnimated: transition.animated,
    });
  }

  const { previous, version } = transition;
  const moving = previous !== undefined;
  const settle = () =>
    setTransition((state) =>
      state.version === version && state.previous !== undefined
        ? { ...state, previous: undefined }
        : state,
    );

  useEffect(() => {
    if (!moving) return;
    const finish = () =>
      setTransition((state) =>
        state.version === version ? { ...state, previous: undefined } : state,
      );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTransition((state) =>
        state.version === version
          ? { ...state, previous: undefined, animated: false }
          : state,
      );
      return;
    }
    const timer = window.setTimeout(finish, 720);
    return () => window.clearTimeout(timer);
  }, [moving, version]);

  const label = current ? t.messages.label(messagePreviewText(current, t.messages)) : undefined;
  const row = (message: MessagePreview | null) =>
    message ? <MessageContent preview={message} /> : children;
  const idleHeld = holdIdle && !current;

  return (
    <span
      className="island__summary"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={label}
      data-direction={current ? "message" : "restore"}
    >
      {moving && (
        <span
          key={version - 1}
          className="island__summary-layer island__summary-layer--outgoing"
          aria-hidden="true"
        >
          <span
            className={`island__summary-row${transition.previousAnimated ? " island__summary-row--animated" : ""}${previous ? " island-message-preview" : ""}`}
          >
            {row(previous)}
          </span>
        </span>
      )}
      <span
        // A new key when the hold ends replays the enter animation on the idle content.
        key={idleHeld ? `${version}-held` : version}
        className={`island__summary-layer${moving ? " island__summary-layer--incoming" : ""}`}
      >
        <span
          className={`island__summary-row${transition.animated ? " island__summary-row--animated" : ""}${current ? " island-message-preview" : ""}`}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) settle();
          }}
        >
          {idleHeld ? null : row(current)}
        </span>
      </span>
    </span>
  );
}
