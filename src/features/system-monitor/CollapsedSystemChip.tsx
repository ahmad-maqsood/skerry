import type { ReactNode } from "react";
import { useTranslation } from "../../i18n";
import { formatPercent } from "./formatters.ts";
import { useSystemMonitor } from "./useSystemMonitor.ts";
import "./CollapsedSystemChip.css";

export type CollapsedSystemChipProps = {
  active: boolean;
  onClick?: () => void;
};

export function CollapsedSystemChip({ active, onClick }: CollapsedSystemChipProps): ReactNode {
  const { snapshot, settings } = useSystemMonitor(active);
  const t = useTranslation().systemMonitor;

  if (!settings.enabled || !settings.showCollapsedChip) {
    return null;
  }

  const cpuPercent = snapshot?.cpu.totalPercent ?? 0;
  const isRing = settings.collapsedChipStyle === "ring";

  // SVG circular progress calculation for a 16x16 ring (radius 6, circumference ~37.7)
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, cpuPercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <button
      type="button"
      className="island-system-chip"
      onClick={onClick}
      title={t.chipTooltip(formatPercent(cpuPercent))}
      aria-label={t.chipTooltip(formatPercent(cpuPercent))}
    >
      {isRing ? (
        <>
          <div className="island-system-chip__ring-wrapper" aria-hidden="true">
            <svg className="island-system-chip__ring" width="16" height="16" viewBox="0 0 16 16">
              <circle
                className="island-system-chip__ring-bg"
                cx="8"
                cy="8"
                r={radius}
                strokeWidth="2"
                fill="none"
              />
              <circle
                className="island-system-chip__ring-val"
                cx="8"
                cy="8"
                r={radius}
                strokeWidth="2"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span>{Math.round(cpuPercent)}%</span>
        </>
      ) : (
        <>
          <span className="island-system-chip__label">CPU</span>
          <span>{Math.round(cpuPercent)}%</span>
        </>
      )}
    </button>
  );
}
