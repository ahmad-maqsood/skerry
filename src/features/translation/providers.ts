// Mirrors PROVIDERS in src-tauri/src/translation/provider.rs.
export const TRANSLATION_PROVIDERS = [
  "google",
  "mymemory",
  "openai",
  "custom",
] as const;

export type TranslationProvider = (typeof TRANSLATION_PROVIDERS)[number];

export const DEFAULT_TRANSLATION_PROVIDER: TranslationProvider = "google";
export const LEGACY_TRANSLATION_PROVIDER: TranslationProvider = "google";

export const DEFAULT_PROVIDER_MODELS: Partial<Record<TranslationProvider, string>> = {};

const KEYLESS_TRANSLATION_PROVIDERS: ReadonlySet<TranslationProvider> = new Set(["google", "mymemory"]);

export function isKeylessTranslationProvider(provider: TranslationProvider) {
  return KEYLESS_TRANSLATION_PROVIDERS.has(provider);
}

export function isTranslationProvider(value: unknown): value is TranslationProvider {
  return TRANSLATION_PROVIDERS.includes(value as TranslationProvider);
}
