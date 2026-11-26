import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import { formatClock, formatDateChip, nextTickDelay, type ClockHourFormat } from "./model";
import "./CollapsedClock.css";

const CLOCK_PARTS = ["hours", "minutes", "seconds"] as const;

export type CollapsedClockProps = {
  active: boolean;
  hourFormat?: ClockHourFormat;
  showSeconds?: boolean;
  showDateOnHover?: boolean;
};

/**
 * Glanceable clock in tabular numerals, bold hours and light minutes, with a subtle tick.
 * Ticks only every whole second when seconds are visible, or at whole minutes otherwise.
 * Pauses ticking when the island is inactive (hidden, expanded, or tucked).
 */
export function CollapsedClock({
  active,
  hourFormat = "auto",
  showSeconds = false,
  showDateOnHover = true,
}: CollapsedClockProps) {
  const [now, setNow] = useState(() => new Date());
  const [animating, setAnimating] = useState(false);
  const prevTimeRef = useRef("");
  const animTimerRef = useRef(0);
  const t = useTranslation().settings.plugins.clockWeather;

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const update = () => {
      window.clearTimeout(timer);
      const nextDate = new Date();
      setNow(nextDate);
      const currentTimeStr = formatClock(nextDate, { hourFormat, showSeconds });
      if (prevTimeRef.current && prevTimeRef.current !== currentTimeStr) {
        setAnimating(true);
        window.clearTimeout(animTimerRef.current);
        animTimerRef.current = window.setTimeout(() => setAnimating(false), 240);
      }
      prevTimeRef.current = currentTimeStr;
      timer = window.setTimeout(update, nextTickDelay(Date.now(), showSeconds));
    };

    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(animTimerRef.current);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [active, hourFormat, showSeconds]);

  const timeText = formatClock(now, { hourFormat, showSeconds });
  const dateText = formatDateChip(now);

  return (
    <div className="collapsed-clock-wrapper" aria-label={t.timeLabel(timeText)}>
      {showDateOnHover && (
        <span className="collapsed-clock__date-chip" aria-hidden="true">
          {dateText}
        </span>
      )}
      <time
        className={`collapsed-clock${animating ? " collapsed-clock--tick" : ""}${showSeconds ? " collapsed-clock--seconds" : ""}`}
      >
        {timeText.split(":").map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <span className="collapsed-clock__colon">:</span>}
            <span className={`collapsed-clock__${CLOCK_PARTS[index]}`}>{part}</span>
          </Fragment>
        ))}
      </time>
    </div>
  );
}
