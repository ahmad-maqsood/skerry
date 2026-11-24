import { useEffect, useState } from "react";

/**
 * True for `ms` after `held` turns from true to false, and false at any other time. The collapsed
 * bar uses it to fade its status icons back in once an alert has gone, instead of popping in.
 * Derived while rendering (no extra frame), so the first frame after the release already has it.
 */
export function useReleasedFlag(held: boolean, ms: number): boolean {
  const [state, setState] = useState({ held, released: false });
  if (state.held !== held) setState({ held, released: state.held && !held && ms > 0 });
  const released = state.held === held && state.released;
  useEffect(() => {
    if (!released) return;
    const timer = window.setTimeout(() => setState((current) => ({ ...current, released: false })), ms);
    return () => window.clearTimeout(timer);
  }, [released, ms]);
  return released;
}
