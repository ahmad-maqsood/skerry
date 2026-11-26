import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { PLUGINS_ENABLED } from "../../src/features/releaseFlags.ts";
import { usePlugins, refreshPlugins } from "../../src/features/plugins/usePlugins";
import "../../src/styles/tokens.css";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const calls: string[] = [];
mockIPC((command) => { calls.push(command); return null; }, { shouldMockEvents: true });
function Probe() {
  const plugins = usePlugins();
  return <output>{JSON.stringify({ plugins })}</output>;
}
const messages: string[] = [];
function check(condition: unknown, label: string) {
  if (!condition) throw new Error(label);
  messages.push(`PASS ${label}`);
}
const root = createRoot(document.getElementById("fixture")!);
try {
  await act(async () => root.render(<StrictMode><I18nProvider><Probe /></I18nProvider></StrictMode>));
  await act(async () => { await refreshPlugins(); });
  if (PLUGINS_ENABLED) {
    // Plugins are on in this build: consumers ask the host for its snapshot.
    check(calls.includes("get_plugins"), "Mounting plugin consumers requests the plugin host snapshot");
  } else {
    // When the flag is off, consumers never touch the host.
    check(calls.length === 0, "Mounting plugin consumers on the island does not request host, index, or event subscriptions");
  }
  check(document.querySelector("output")?.textContent?.includes('"installed":{}'), "Empty plugin snapshot generates no sessions, quota, or message entries");
  await act(async () => root.unmount());
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  messages.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = messages.join("\n");
