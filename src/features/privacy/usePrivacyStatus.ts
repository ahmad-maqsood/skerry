import { useEffect, useState } from "react";
import { getPrivacyStatus, type PrivacyStatus } from "./api.ts";
import { NO_PRIVACY_ACTIVITY, normalizePrivacyStatus, samePrivacyStatus } from "./privacyStatus.ts";

/** How often the Windows privacy settings are looked at while the dot can be seen. */
const POLL_MS = 3000;

/** Which of the microphone and camera are in use; nothing is read while `active` is false. */
export function usePrivacyStatus(active: boolean): PrivacyStatus {
  const [status, setStatus] = useState<PrivacyStatus>(NO_PRIVACY_ACTIVITY);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const read = () => {
      void getPrivacyStatus()
        .then((reply) => {
          if (cancelled) return;
          const next = normalizePrivacyStatus(reply);
          setStatus((current) => (samePrivacyStatus(current, next) ? current : next));
        })
        .catch(() => {
          // A failed read keeps the last answer; the next poll tries again.
        });
    };
    read();
    const timer = window.setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active]);

  return active ? status : NO_PRIVACY_ACTIVITY;
}
