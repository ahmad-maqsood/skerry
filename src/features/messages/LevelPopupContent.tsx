import { Sun, Volume1, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import type { MessagePreview } from "./messagePreview";
import "./LevelPopupContent.css";

/** The speaker thins out with the level and goes silent at 0; brightness is always the sun. */
function levelIcon(kind: MessagePreview["kind"], level: number): LucideIcon {
  if (kind === "brightness") return Sun;
  if (level <= 0) return VolumeX;
  return level < 50 ? Volume1 : Volume2;
}

/**
 * The collapsed island's volume or brightness pop-up: an icon, a bar and the number. The bar is
 * decoration (the pop-up's own label already reads "Volume · 45%"), and it moves in place with a
 * transition, so holding a volume key slides it instead of replaying the pop-up each step.
 */
export function LevelPopupContent({ preview }: { preview: MessagePreview }) {
  const level = Math.min(100, Math.max(0, Math.round(preview.level ?? 0)));
  const Icon = levelIcon(preview.kind, level);
  return (
    <>
      <span className="island-level__icon" aria-hidden="true">
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="island-level__track" aria-hidden="true">
        <span className="island-level__fill" style={{ transform: `scaleX(${level / 100})` }} />
      </span>
      <span className="island-level__value" aria-hidden="true">{level}</span>
    </>
  );
}
