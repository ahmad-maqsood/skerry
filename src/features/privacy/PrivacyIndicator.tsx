import type { ReactNode } from "react";
import { Camera, Mic } from "lucide-react";
import { useTranslation } from "../../i18n";
import { devicesInUse } from "./privacyStatus.ts";
import { usePrivacySettings } from "./usePrivacySettings.ts";
import { usePrivacyStatus } from "./usePrivacyStatus.ts";
import "./PrivacyIndicator.css";

/** The orange microphone and green camera dots of the collapsed island, shown while one is in use. */
export function PrivacyIndicator({ active }: { active: boolean }): ReactNode {
  const t = useTranslation().privacy;
  const { settings } = usePrivacySettings();
  const status = usePrivacyStatus(active && settings.enabled);
  const devices = devicesInUse(status);
  if (devices.length === 0) return null;

  const label =
    devices.length === 2 ? t.microphoneAndCameraInUse : devices[0] === "microphone" ? t.microphoneInUse : t.cameraInUse;
  return (
    <span className="privacy-indicator" role="status" aria-label={label} title={label}>
      {devices.map((device) => (
        <span key={device} className={`privacy-indicator__dot privacy-indicator__dot--${device}`}>
          {device === "microphone" ? (
            <Mic size={10} strokeWidth={2.2} absoluteStrokeWidth aria-hidden="true" />
          ) : (
            <Camera size={10} strokeWidth={2.2} absoluteStrokeWidth aria-hidden="true" />
          )}
        </span>
      ))}
    </span>
  );
}
