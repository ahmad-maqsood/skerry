/**
 * Sends only the newest value of a slider: it waits `delayMs` after the last push, never runs two
 * calls at once, and runs again with the newest value when a call finishes after a newer push.
 */
export function createLatestRunner(run: (value: number) => Promise<unknown>, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: number | null = null;
  let running = false;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    clearTimer();
    if (running || latest === null) return;
    const value = latest;
    latest = null;
    running = true;
    void run(value)
      .catch(() => {
        // The next push tries again.
      })
      .finally(() => {
        running = false;
        if (latest !== null) timer = setTimeout(flush, 0);
      });
  };

  return {
    push(value: number) {
      latest = value;
      clearTimer();
      timer = setTimeout(flush, delayMs);
    },
    /** Sends the pending value now, e.g. when the panel closes before the delay is up. */
    flush,
  };
}
