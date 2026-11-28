import { useEffect, useState } from "react";
import { clockLines, msUntilNextMinute, type ClockLines, type ClockNames } from "./text";

/** The clock's lines, renewed each time the minute changes. */
export function useClockLines(names: ClockNames): ClockLines {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(tick, msUntilNextMinute(current));
    };
    timer = window.setTimeout(tick, msUntilNextMinute(new Date()));
    return () => window.clearTimeout(timer);
  }, []);

  return clockLines(now, names);
}
