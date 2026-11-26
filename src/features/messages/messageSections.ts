/** The two lists the Notifications page can show. */
export type MessageSection = "system" | "plugins";

const STORAGE_KEY = "skerry-messages-section";

/** The section the person last picked; null when there is none or it cannot be read. */
export function loadMessageSection(): MessageSection | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "system" || stored === "plugins" ? stored : null;
  } catch {
    return null;
  }
}

export function saveMessageSection(section: MessageSection): void {
  try {
    localStorage.setItem(STORAGE_KEY, section);
  } catch { /* The choice still applies while the page stays open. */ }
}

/**
 * The section on show. Without plugin content there is only the system list. Otherwise the person's
 * last choice stands, and system is the default.
 */
export function visibleSection(chosen: MessageSection | null, pluginsHaveContent: boolean): MessageSection {
  if (!pluginsHaveContent) return "system";
  return chosen ?? "system";
}
