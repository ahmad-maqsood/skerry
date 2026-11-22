/**
 * Languages a translation can be written in. `code` is what the services take (Google
 * Translate's codes, which MyMemory also reads); `name` and `native` are the language's
 * English name and its own name, shown in the picker and matched by its search.
 * Mirrored by LANGUAGES in src-tauri/src/translation/language.rs, which a unit test compares.
 */
export type TranslationLanguage = { code: string; name: string; native: string };

/** The output choice that keeps the earlier behaviour: Chinese into English, anything else into Chinese. */
export const AUTO_TARGET_LANGUAGE = "auto";

export const TRANSLATION_LANGUAGES: readonly TranslationLanguage[] = [
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "en", name: "English", native: "English" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
];

export function findTranslationLanguage(code: unknown): TranslationLanguage | undefined {
  return TRANSLATION_LANGUAGES.find((language) => language.code === code);
}

/** True for "auto" and for every language in the list. */
export function isTargetLanguage(value: unknown): value is string {
  return value === AUTO_TARGET_LANGUAGE || findTranslationLanguage(value) !== undefined;
}

/** Lower case without accents, so "espanol" finds "Español" and "turkce" finds "Türkçe". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * The languages that match what was typed, best first: an exact code, then names that start
 * with it, then names or codes that contain it. Matches the English name, the language's own
 * name and the code. An empty query lists every language in alphabetical order of its name.
 */
export function searchTranslationLanguages(query: string): TranslationLanguage[] {
  const wanted = fold(query.trim());
  if (!wanted) return [...TRANSLATION_LANGUAGES];
  const ranked: { language: TranslationLanguage; rank: number }[] = [];
  for (const language of TRANSLATION_LANGUAGES) {
    const code = fold(language.code);
    const names = [fold(language.name), fold(language.native)];
    const rank = code === wanted ? 0
      : names.some((name) => name.startsWith(wanted)) ? 1
        : names.some((name) => name.split(/[\s()]+/).some((word) => word.startsWith(wanted))) ? 2
          : names.some((name) => name.includes(wanted)) || code.includes(wanted) ? 3
            : -1;
    if (rank >= 0) ranked.push({ language, rank });
  }
  // Array.prototype.sort is stable, so equal ranks keep the alphabetical order of the list.
  return ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.language);
}

export type LanguageChoice = { code: string; label: string; native?: string };

/**
 * What the picker lists for `query`: the matching languages, led by the automatic choice when the
 * query is empty or starts to spell it ("au"). `autoLabel` is that choice's text.
 */
export function languageChoices(query: string, autoLabel: string): LanguageChoice[] {
  const languages = searchTranslationLanguages(query).map(({ code, name, native }) => ({ code, label: name, native }));
  const wanted = fold(query.trim());
  return !wanted || fold(autoLabel).startsWith(wanted)
    ? [{ code: AUTO_TARGET_LANGUAGE, label: autoLabel }, ...languages]
    : languages;
}
