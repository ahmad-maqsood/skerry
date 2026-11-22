export type TranslatorText = {
  label: string;
  title: string;
  subtitle: string;
  settings: string;
  closeLabel: string;
  credentialHint: string;
  provider: string;
  providers: {
    openai: string;
    custom: string;
    google: string;
    mymemory: string;
  };
  keylessHint: string;
  baseUrl: string;
  baseUrlHint: string;
  model: string;
  modelDefault: (model: string) => string;
  modelRequired: string;
  secret: string;
  replaceSecret: string;
  enterSecret: string;
  saveSecret: string;
  deleteSecret: string;
  shortcut: string;
  pressShortcut: string;
  shortcutHint: string;
  /** Names the output language picker for screen readers. */
  targetLanguage: string;
  /** The source side of the language bar: the source language is always detected. */
  auto: string;
  /** The picker's first choice: Chinese is translated into English, anything else into Chinese. */
  autoTarget: string;
  searchLanguages: string;
  noLanguageMatch: string;
  source: string;
  placeholder: string;
  paste: string;
  result: string;
  copy: string;
  copied: string;
  clearSource: string;
  loading: string;
  emptyResult: string;
  configureSecret: string;
  enterHint: string;
  translate: string;
  emptyClipboard: string;
  panelPlaceholder: string;
  emptySource: string;
  tooLong: string;
  clipboard: (text: string) => string;
};

export const en: TranslatorText = {
  label: "Quick translation",
  title: "Quick translation",
  subtitle: "Multilingual",
  settings: "Translation settings",
  closeLabel: "Close translation window",
  credentialHint: "Keys are stored only in Windows Credential Manager on this PC, one per service",
  provider: "Service",
  providers: {
    openai: "OpenAI",
    custom: "Custom (OpenAI-compatible)",
    google: "Google Translate (no key)",
    mymemory: "MyMemory (no key)",
  },
  keylessHint: "No key needed; good for words and short sentences. Google Translate and MyMemory are free endpoints; use an OpenAI-compatible model for long text",
  baseUrl: "Base URL",
  baseUrlHint: "Address of an OpenAI-compatible API, such as https://example.com/v1; local services may use http://localhost",
  model: "Model",
  modelDefault: (model) => `Leave empty for ${model}`,
  modelRequired: "Model name or endpoint ID from the provider",
  secret: "API key",
  replaceSecret: "Enter a new key to replace it",
  enterSecret: "Enter your API key",
  saveSecret: "Save key",
  deleteSecret: "Delete saved key",
  shortcut: "Global shortcut",
  pressShortcut: "Press a key combination…",
  shortcutHint: "Click the field, then press a new key combination",
  targetLanguage: "Translate into",
  auto: "Auto-detect",
  autoTarget: "Auto: English ↔ Chinese",
  searchLanguages: "Search languages",
  noLanguageMatch: "No language matches",
  source: "Source",
  placeholder: "Enter text, or press Tab to paste the latest clipboard text",
  paste: "Paste latest clipboard text",
  result: "Translation",
  copy: "Copy translation",
  copied: "Copied",
  clearSource: "Clear source and translation",
  loading: "Translating…",
  emptyResult: "Your translation will appear here",
  configureSecret: "Set up a translation service",
  enterHint: "Enter to translate · Shift+Enter for a new line",
  translate: "Translate",
  emptyClipboard: "The clipboard has no text to paste.",
  panelPlaceholder: "Type text to translate; Enter translates",
  emptySource: "Enter source text, or press Tab to paste from the clipboard.",
  tooLong: "Translate up to 5,000 characters at a time.",
  clipboard: (text) => `Clipboard: ${text}`,
};
