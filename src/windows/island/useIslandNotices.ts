import { useCallback, useState } from "react";
import { useSystemNotifications } from "../../features/messages/system-notifications/useSystemNotifications";
import type { IslandSettings } from "../../features/appearance/types";
import type { PreviewKind } from "../../features/messages/messagePreview";
import type { IslandMode } from "./types";
import { canPreviewNotice, expandsPreview, previewSecondsFor } from "./noticeRules";
import { useHeldPreview } from "./useHeldPreview";

/** What can pop up on the collapsed island: generic system notifications. */
export function useIslandNotices(
  settings: IslandSettings,
  { mode, isTucked, quiet }: { mode: IslandMode; isTucked: boolean; quiet: boolean },
) {
  const canPreviewMessages = canPreviewNotice(settings, quiet, mode, isTucked);
  // A preview that expands stays for the expanded duration, any other for the normal one.
  const previewSeconds = (shown: { kind?: PreviewKind }) => previewSecondsFor(settings, quiet, expandsPreview(settings, shown.kind), shown.kind);
  const systemNotifications = useSystemNotifications(canPreviewMessages, previewSeconds);

  const heldPreview = useHeldPreview(systemNotifications.preview, !quiet);
  // The preview the user sent away (minimize). It stays dismissed: the cursor on the island holds a
  // preview past its seconds, and a showing preview slides a tucked island back out, so without this
  // the minimize button only flickered.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const preview = heldPreview && heldPreview.receivedAt !== dismissedAt ? heldPreview : null;
  const live = systemNotifications.preview;
  const hasMessagePreview = Boolean((live && live.receivedAt !== dismissedAt) || preview);

  const currentAt = (live ?? heldPreview)?.receivedAt ?? null;
  const dismissPreview = useCallback(() => {
    if (currentAt !== null) setDismissedAt(currentAt);
  }, [currentAt]);

  return { systemNotifications, preview, hasMessagePreview, dismissPreview, canPreviewMessages };
}
