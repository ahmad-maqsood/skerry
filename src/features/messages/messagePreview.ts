import en from "../../i18n/locales/en.ts";
import type { Translations } from "../../i18n/types";

export type MessagePreview = {
  id: string;
  appId: string;
  appDisplayName: string;
  title: string;
  body: string;
  timestamp: number;
  appLogo?: string | null;
  receivedAt: number;
  /** Set for the island's own pop-ups (a copied text, a new song, the charger, a device): they open a page, not an app. */
  kind?: PreviewKind;
};

export type PreviewKind = "clipboard" | "music" | "battery" | "bluetooth" | "airplane";

/**
 * Which pop-up wins when two want the bar: a higher one is not replaced by a lower one while it
 * shows. Device notices (a Bluetooth connection, airplane mode) give way to anything the user is more likely to
 * be waiting for (a notification from an app, a copied text, a new song); the rest replace each other.
 */
export function previewPriority(kind?: PreviewKind): number {
  return kind === "bluetooth" || kind === "airplane" ? 2 : 3;
}

export function messagePreviewText(
  preview: MessagePreview,
  copy: Translations["messages"] = en.messages,
): string {
  const app = preview.appDisplayName || preview.appId || "App";
  const title = preview.title.trim();
  const body = preview.body.trim();
  if (title && body) {
    return copy.previewFormat(app, title, body);
  }
  return `${app} · ${title || body || copy.newMessage}`;
}

export function noticeText(
  preview: MessagePreview,
  copy: Translations["messages"] = en.messages,
): { sender: string; body: string } {
  const app = preview.appDisplayName || preview.appId || "App";
  const sender = preview.title.trim() ? `${app} · ${preview.title.trim()}` : app;
  const body = preview.body.trim() || copy.newMessage;
  return { sender, body };
}

export function latestMessagePreview(
  candidates: (MessagePreview | null)[],
  latestReceivedAt = -Infinity,
): MessagePreview | null {
  return candidates.reduce<MessagePreview | null>(
    (latest, candidate) =>
      candidate &&
      candidate.receivedAt >= latestReceivedAt &&
      (!latest || candidate.receivedAt > latest.receivedAt)
        ? candidate
        : latest,
    null,
  );
}

export function messageBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
