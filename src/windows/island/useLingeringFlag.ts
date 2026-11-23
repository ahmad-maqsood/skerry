import { useEffect, useState } from "react";

/**
 * `active`, held on for `lingerMs` after it turns false. Turning on is immediate. The collapsed bar
 * uses it to keep its alert layout until the alert has finished sliding out, so the status icons do
 * not pop back in beside text that is still leaving.
 */
export function useLingeringFlag(active: boolean, lingerMs: number): boolean {
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (active) {
      setLingering(true);
      return;
    }
    const timer = window.setTimeout(() => setLingering(false), lingerMs);
    return () => window.clearTimeout(timer);
  }, [active, lingerMs]);
  return active || lingering;
}
