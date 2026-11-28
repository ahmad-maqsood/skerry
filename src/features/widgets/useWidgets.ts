import { useEffect, useState } from "react";
import { getWidgets, setWidget, type WidgetId, type WidgetsState } from "./api";

/** The widgets' switches as the native side has them; `state` is null until it has been read. */
export function useWidgets() {
  const [state, setState] = useState<WidgetsState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWidgets()
      .then((next) => { if (!cancelled) setState(next); })
      .catch((reason: unknown) => { if (!cancelled) setError(String(reason)); });
    return () => { cancelled = true; };
  }, []);

  const toggle = async (widget: WidgetId, enabled: boolean) => {
    setError(null);
    try {
      setState(await setWidget(widget, enabled));
    } catch (reason) {
      setError(String(reason));
    }
  };

  return { state, error, toggle };
}
