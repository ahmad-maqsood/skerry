import { Bell } from "lucide-react";
import "./MessageSourceIcon.css";

export function MessageSourceIcon({
  logo,
  name = "App",
  size = 16,
}: {
  logo?: string | null;
  name?: string;
  size?: number;
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

  return (
    <span
      className="message-source-icon message-source-icon--fallback"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Bell size={Math.max(12, size - 4)} strokeWidth={2} />
    </span>
  );
}
