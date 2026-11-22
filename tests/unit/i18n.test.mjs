import assert from "node:assert/strict";
import test from "node:test";
import { detectLocale, isLocaleCode, loadLocale, saveLocale, LOCALE_STORAGE_KEY, TRANSLATIONS } from "../../src/i18n/index.ts";
import { messagePreviewText } from "../../src/features/messages/messagePreview.ts";
import { getCollapsedTextUnits, getTodoTitleLineCount, getTodoTitleVisualLength } from "../../src/utils/text.ts";

test("the app is English only: every system language resolves to en", () => {
  for (const languages of [["en-US", "zh-CN"], ["zh-Hant-TW", "en-GB"], ["fr-FR"], ["de-DE"], []]) {
    assert.equal(detectLocale(languages), "en", String(languages));
  }
  assert.deepEqual(Object.keys(TRANSLATIONS), ["en"]);
});

test("stored locale validation rejects prototype keys and malformed values", () => {
  for (const value of ["constructor", "toString", "__proto__", "en-US", "zh-CN", "", null, {}, 1]) {
    assert.equal(isLocaleCode(value), false, String(value));
  }
  assert.equal(isLocaleCode("en"), true);
});

test("saved preferences never leave English, and blocked storage falls back safely", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const values = new Map([[LOCALE_STORAGE_KEY, "zh-CN"]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { languages: ["zh-CN"], language: "zh-CN" } });
  try {
    assert.equal(loadLocale(), "en");
    saveLocale("en");
    assert.equal(values.get(LOCALE_STORAGE_KEY), "en");
    values.set(LOCALE_STORAGE_KEY, "constructor");
    assert.equal(loadLocale(), "en");
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
    assert.equal(loadLocale(), "en");
    assert.doesNotThrow(() => saveLocale("en"));
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else delete globalThis.window;
    Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  }
});

test("the English dictionary has complete, nonempty copy including new panels", () => {
  function entries(value, prefix = "") {
    return Object.entries(value).flatMap(([key, item]) => typeof item === "object"
      ? entries(item, `${prefix}${key}.`)
      : [[`${prefix}${key}`, item]]);
  }
  for (const [key, value] of entries(TRANSLATIONS.en)) {
    assert.ok(typeof value === "function" || typeof value === "string" && value.trim(), key);
  }
  assert.equal(TRANSLATIONS.en.island.pendingTodos(1), "1 todo left");
  assert.equal(TRANSLATIONS.en.island.pendingTodos(2), "2 todos left");
});

test("message fallbacks follow the interface language and preserve user content", () => {
  const item = { id: "1", appId: "WhatsApp", appDisplayName: "WhatsApp", title: "Alice", body: "Hello", timestamp: 0, receivedAt: 0 };
  assert.equal(messagePreviewText(item, TRANSLATIONS.en.messages), "WhatsApp · Alice: Hello");
  assert.equal(messagePreviewText({ ...item, body: " " }, TRANSLATIONS.en.messages), "WhatsApp · Alice");
});

test("narrow scripts do not inflate island sizing and wide scripts still wrap", () => {
  assert.equal(getTodoTitleVisualLength("Привет"), 6);
  assert.equal(getTodoTitleVisualLength("Ελλάδα"), 6);
  assert.equal(getTodoTitleVisualLength("😀😀"), 3.2);
  assert.equal(getTodoTitleLineCount("я".repeat(32)), 1);
  assert.equal(getTodoTitleLineCount("😀".repeat(21)), 2);
  assert.equal(getTodoTitleLineCount("x".repeat(1000)), 5);
  assert.equal(getTodoTitleLineCount(""), 1);
  assert.equal(getCollapsedTextUnits("Привет"), getCollapsedTextUnits("abcdef"));
  assert.equal(getCollapsedTextUnits("😀😀"), 2);
});
