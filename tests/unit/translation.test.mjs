import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  normalizeTranslationSettings,
} from "../../src/features/translation/storage.ts";
import {
  TRANSLATION_LANGUAGES,
  findTranslationLanguage,
  isTargetLanguage,
  languageChoices,
  searchTranslationLanguages,
} from "../../src/features/translation/languages.ts";

test("settings saved before providers existed keep Google and their shortcut and output language", () => {
  assert.deepEqual(normalizeTranslationSettings({ shortcut: "Ctrl+Q", direction: "en-zh" }), {
    shortcut: "Ctrl+Q",
    shortcutEnabled: true,
    targetLanguage: "zh-CN",
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

test("a saved direction becomes the matching output language, and a chosen language wins", () => {
  assert.equal(DEFAULT_SETTINGS.targetLanguage, "auto");
  assert.equal(normalizeTranslationSettings({ direction: "zh-en" }).targetLanguage, "en");
  assert.equal(normalizeTranslationSettings({ direction: "en-zh" }).targetLanguage, "zh-CN");
  assert.equal(normalizeTranslationSettings({ direction: "auto" }).targetLanguage, "auto");
  assert.equal(normalizeTranslationSettings({ direction: "en-zh", targetLanguage: "ur" }).targetLanguage, "ur");
  assert.equal(normalizeTranslationSettings({ targetLanguage: "auto" }).targetLanguage, "auto");
  assert.equal(normalizeTranslationSettings({ targetLanguage: "klingon" }).targetLanguage, "auto");
  assert.equal(normalizeTranslationSettings({ targetLanguage: 7 }).targetLanguage, "auto");
  assert.equal("direction" in normalizeTranslationSettings({ direction: "zh-en" }), false);
});

test("English and Urdu are offered, and only listed languages are accepted", () => {
  assert.equal(findTranslationLanguage("en")?.name, "English");
  assert.equal(findTranslationLanguage("ur")?.name, "Urdu");
  assert.equal(isTargetLanguage("ur"), true);
  assert.equal(isTargetLanguage("auto"), true);
  assert.equal(isTargetLanguage("UR"), false);
  assert.equal(isTargetLanguage(undefined), false);
  const codes = TRANSLATION_LANGUAGES.map((language) => language.code);
  assert.equal(new Set(codes).size, codes.length);
});

test("language search matches names, own names and codes, best match first", () => {
  const names = (query) => searchTranslationLanguages(query).map((language) => language.name);
  assert.equal(names("").length, TRANSLATION_LANGUAGES.length);
  assert.deepEqual(names("urd"), ["Urdu"]);
  assert.deepEqual(names("اردو"), ["Urdu"]);
  assert.equal(names("ur")[0], "Urdu");
  assert.equal(names("  ENGLISH ")[0], "English");
  assert.deepEqual(names("espanol"), ["Spanish"]);
  assert.deepEqual(names("turkce"), ["Turkish"]);
  assert.equal(names("chinese").length, 2);
  assert.equal(names("zh-tw")[0], "Chinese (Traditional)");
  assert.deepEqual(names("simplified"), ["Chinese (Simplified)"]);
  assert.deepEqual(names("zzzz"), []);
});

test("the picker leads with the automatic choice until the search rules it out", () => {
  const codes = (query) => languageChoices(query, "Auto: English ↔ Chinese").map((choice) => choice.code);
  assert.equal(codes("")[0], "auto");
  assert.equal(codes("").length, TRANSLATION_LANGUAGES.length + 1);
  assert.equal(codes("au")[0], "auto");
  assert.deepEqual(codes("urdu"), ["ur"]);
  assert.deepEqual(codes("qqq"), []);
});

test("the native language table has the same codes and English names as the app's", () => {
  const rust = readFileSync(new URL("../../src-tauri/src/translation/language.rs", import.meta.url), "utf8");
  const native = [...rust.matchAll(/Language \{ code: "([^"]+)", name: "([^"]+)" \}/g)].map((match) => [match[1], match[2]]);
  assert.deepEqual(native, TRANSLATION_LANGUAGES.map((language) => [language.code, language.name]));
});
