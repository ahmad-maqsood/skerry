import { Bell, BatteryCharging, Clipboard, Music } from "lucide-react";
import type { PreviewKind } from "./messagePreview";
import "./MessageSourceIcon.css";

export function MessageSourceIcon({
  logo,
  name = "App",
  size = 16,
  kind,
}: {
  logo?: string | null;
  name?: string;
  size?: number;
  /** The island's own pop-ups show their own icon when there is no logo (the cover). */
  kind?: PreviewKind;
}) {
  if (logo) {
    return (
      <img
        className="message-source-icon"
        src={logo}
        alt={name}
        aria-hidden="true"
        width={size}
        height={size}
        draggable={false}
      />
    );
  }

  const Icon = kind === "clipboard" ? Clipboard : kind === "music" ? Music : kind === "battery" ? BatteryCharging : Bell;
  return (
    <span
      className="message-source-icon message-source-icon--fallback"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon size={Math.max(12, size - 4)} strokeWidth={2} />
    </span>
  );
}
