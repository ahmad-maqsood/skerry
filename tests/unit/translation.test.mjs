import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  normalizeTranslationSettings,
} from "../../src/features/translation/storage.ts";

test("settings saved before providers existed keep Google and their shortcut and direction", () => {
  assert.deepEqual(normalizeTranslationSettings({ shortcut: "Ctrl+Q", direction: "en-zh" }), {
    shortcut: "Ctrl+Q",
    shortcutEnabled: true,
    direction: "en-zh",
    provider: "google",
    customBaseUrl: "",
    models: {},
    pasteClipboardOnOpen: true,
    autoTranslate: false,
  });
  assert.deepEqual(normalizeTranslationSettings(null), DEFAULT_SETTINGS);
  assert.equal(DEFAULT_SETTINGS.provider, "google");
  assert.equal(normalizeTranslationSettings({ shortcut: "Alt+Space" }).shortcut, "Ctrl+Shift+F");
  assert.equal(normalizeTranslationSettings({ shortcut: "Alt+C" }).shortcut, "Ctrl+Shift+F");
});

test("the shortcut switch stays on unless turned off, and keyless services are known", async () => {
  assert.equal(normalizeTranslationSettings({ shortcutEnabled: false }).shortcutEnabled, false);
  assert.equal(normalizeTranslationSettings({ shortcutEnabled: "no" }).shortcutEnabled, true);
  const { isKeylessTranslationProvider, isTranslationProvider } = await import("../../src/features/translation/providers.ts");
  assert.equal(isTranslationProvider("google"), true);
  assert.equal(isKeylessTranslationProvider("mymemory"), true);
  assert.equal(isKeylessTranslationProvider("openai"), false);
  assert.equal(normalizeTranslationSettings({ provider: "google" }).provider, "google");
});

test("provider, custom base URL and per-provider models are kept when valid", () => {
  const settings = normalizeTranslationSettings({
    provider: "custom",
    customBaseUrl: "http://localhost:11434/v1",
    models: { custom: "qwen3:8b", baidu: "x", openai: 4 },
  });
  assert.equal(settings.provider, "custom");
  assert.equal(settings.customBaseUrl, "http://localhost:11434/v1");
  assert.deepEqual(settings.models, { custom: "qwen3:8b" });
  assert.equal(normalizeTranslationSettings({ provider: "baidu" }).provider, "google");
  assert.equal(normalizeTranslationSettings({ provider: "openai" }).provider, "openai");
  assert.deepEqual(normalizeTranslationSettings({ models: "x" }).models, {});
});

test("clipboard fill stays on and auto-translate off: they are no longer settings", () => {
  const settings = normalizeTranslationSettings({ pasteClipboardOnOpen: false, autoTranslate: true });
  assert.equal(settings.pasteClipboardOnOpen, true);
  assert.equal(settings.autoTranslate, false);
  assert.equal(normalizeTranslationSettings({ autoTranslate: "yes" }).autoTranslate, false);
});
