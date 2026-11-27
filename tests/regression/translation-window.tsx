import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { act } from "react";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "../../src/i18n";

// The quick translation window in each colour scheme: ?theme=dark|light|system (the island
// settings' colorScheme). With ?test=1 it checks the window follows the scheme and stays readable.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const query = new URLSearchParams(location.search);
const theme = query.get("theme") ?? "dark";
localStorage.setItem("skerry-settings", JSON.stringify({ colorScheme: theme }));
mockWindows("translation");
mockIPC((command) => {
  switch (command) {
    case "has_translation_secret": return true;
    case "set_translation_shortcut": return "Ctrl+Alt+T";
    case "read_translation_clipboard": return "private clipboard text";
    default: return null;
  }
}, { shouldMockEvents: true });
const { TranslationWindow } = await import("../../src/windows/translation/TranslationWindow");
const { applyDocumentTheme } = await import("../../src/features/appearance/useDocumentTheme");
const { loadSettings } = await import("../../src/features/appearance/storage");
// As main.tsx does before the first paint.
applyDocumentTheme(loadSettings());

const root = createRoot(document.getElementById("root")!);
await act(async () => root.render(<I18nProvider><TranslationWindow /></I18nProvider>));
await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });

if (query.has("test")) {
  const messages: string[] = [];
  const check = (ok: unknown, label: string) => { messages.push(`${ok ? "PASS" : "FAIL"} ${label}`); };
  const luminance = (color: string) => {
    // color-mix() values come back as color(srgb r g b) on a 0-1 scale.
    const scale = color.startsWith("color(") ? 1 : 255;
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number).map((channel) => {
      const value = channel / scale;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const expected = theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  const windowElement = document.querySelector<HTMLElement>(".translation-window")!;
  const surface = luminance(getComputedStyle(windowElement).backgroundColor);
  const text = luminance(getComputedStyle(windowElement).color);
  const contrast = (Math.max(surface, text) + 0.05) / (Math.min(surface, text) + 0.05);
  check(document.documentElement.dataset.theme === expected, `Window writes data-theme=${expected} according to theme`);
  check(expected === "light" ? surface > 0.8 : surface < 0.05, `Window surface follows theme (luminance ${surface.toFixed(2)})`);
  check(contrast >= 7, `Text and surface contrast is sufficient (${contrast.toFixed(1)}:1)`);
  const source = document.querySelector<HTMLTextAreaElement>("#translation-input")!;
  check(source.value === "", "Opening leaves the source box empty");
  check(!windowElement.textContent?.includes("private clipboard text"), "Clipboard text is not shown before pasting");
  const pasteButton = document.querySelector<HTMLButtonElement>(".translation-window__clipboard");
  await act(async () => { pasteButton?.click(); await new Promise((resolve) => setTimeout(resolve, 50)); });
  check(source.value === "private clipboard text", "The paste button pastes the clipboard on request");
  const results = document.getElementById("results")!;
  const failed = messages.some((line) => line.startsWith("FAIL"));
  results.textContent = `${messages.join("\n")}\n${failed ? "FAILED" : "ALL PASS"}`;
  document.documentElement.dataset.testResult = failed ? "failed" : "passed";
}
