import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LocaleCode, Translations } from "./types";
import en from "./locales/en.ts";

export type { LocaleCode, Translations };

export const LOCALE_STORAGE_KEY = "skerry-locale";

export const TRANSLATIONS: Record<LocaleCode, Translations> = {
  en,
};

export const LOCALE_CODES = Object.keys(TRANSLATIONS) as LocaleCode[];

export const FALLBACK_LOCALE: LocaleCode = "en";

export function isLocaleCode(value: unknown): value is LocaleCode {
  return value === "en";
}

export function detectLocale(): LocaleCode {
  return "en";
}

export function loadLocale(): LocaleCode {
  return "en";
}

export function saveLocale(locale: LocaleCode) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage access fallback
  }
}

const TranslationContext = createContext<Translations>(en);
const LocaleContext = createContext<{ locale: LocaleCode; setLocale: (locale: LocaleCode) => void }>({
  locale: "en",
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<LocaleCode>("en");
  const setLocale = () => {};
  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  useEffect(() => { document.documentElement.lang = "en"; }, []);

  return createElement(LocaleContext.Provider, { value },
    createElement(TranslationContext.Provider, { value: en }, children));
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslation() {
  return useContext(TranslationContext);
}
