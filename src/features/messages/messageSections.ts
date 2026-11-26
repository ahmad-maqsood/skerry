/** The two lists the Notifications page can show. */
export type MessageSection = "system" | "plugins";

/**
 * The section on show. Without plugin content there is only the system list. Otherwise the person's
 * choice stands; with no choice yet, plugins open first only when there is no system notification to read.
 */
export function visibleSection(chosen: MessageSection | null, systemCount: number, pluginsHaveContent: boolean): MessageSection {
  if (!pluginsHaveContent) return "system";
  return chosen ?? (systemCount === 0 ? "plugins" : "system");
}
