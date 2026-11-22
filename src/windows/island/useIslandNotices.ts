import { useSystemNotifications } from "../../features/messages/system-notifications/useSystemNotifications";
import type { IslandSettings } from "../../features/appearance/types";
import type { IslandMode } from "./types";
import { canPreviewNotice, previewSecondsFor } from "./noticeRules";
import { useHeldPreview } from "./useHeldPreview";

/** What can pop up on the collapsed island: generic system notifications. */
export function useIslandNotices(
  settings: IslandSettings,
  { mode, isTucked, quiet }: { mode: IslandMode; isTucked: boolean; quiet: boolean },
) {
  const canPreviewMessages = canPreviewNotice(settings, quiet, mode, isTucked);
  const previewSeconds = previewSecondsFor(settings, quiet);
  const systemNotifications = useSystemNotifications(canPreviewMessages, previewSeconds);

  const preview = useHeldPreview(systemNotifications.preview, !quiet);
  const hasMessagePreview = Boolean(systemNotifications.preview || preview);

  return { systemNotifications, preview, hasMessagePreview };
}
