import type { ReactNode } from "react";
import { Sun, Volume1, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import { useTranslation } from "../../i18n";
import { MIN_BRIGHTNESS_PERCENT } from "./quickControls.ts";
import { useQuickControls } from "./useQuickControls.ts";
import "./QuickControls.css";

type SliderRowProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  min?: number;
  onChange: (percent: number) => void;
};

function SliderRow({ icon: Icon, label, value, min = 0, onChange }: SliderRowProps): ReactNode {
  return (
    <label className="quick-controls__row">
      <Icon size={14} aria-hidden="true" />
      <input
        className="quick-controls__slider"
        type="range"
        min={min}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        style={{ "--quick-controls-fill": `${value}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <span className="quick-controls__value">{value}%</span>
    </label>
  );
}

/** Volume, and brightness where the display reports it, as two sliders at the top of the System page. */
export function QuickControls(): ReactNode {
  const t = useTranslation().systemMonitor.quickControls;
  const { volume, brightness, changeVolume, changeBrightness } = useQuickControls();
  // Nothing to show until a value has been read, and nothing at all where neither can be.
  if (volume === null && brightness === null) return null;

  const VolumeIcon = volume === 0 ? VolumeX : volume !== null && volume < 50 ? Volume1 : Volume2;
  return (
    <div className="system-card system-card--full quick-controls" role="group" aria-label={t.title}>
      {volume !== null && <SliderRow icon={VolumeIcon} label={t.volume} value={volume} onChange={changeVolume} />}
      {brightness !== null && (
        <SliderRow icon={Sun} label={t.brightness} value={brightness} min={MIN_BRIGHTNESS_PERCENT} onChange={changeBrightness} />
      )}
    </div>
  );
}
