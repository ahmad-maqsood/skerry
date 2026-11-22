//! The languages a translation can be written in, and which one a request asks for.

use super::direction;

/// A language the services can translate into.
pub(super) struct Language {
    /// Google Translate's code, which MyMemory also reads.
    pub(super) code: &'static str,
    /// The English name, which a language model is asked to translate into.
    pub(super) name: &'static str,
}

// Mirrored by TRANSLATION_LANGUAGES in src/features/translation/languages.ts; a unit test there
// compares the codes.
pub(super) const LANGUAGES: &[Language] = &[
    Language { code: "ar", name: "Arabic" },
    Language { code: "bn", name: "Bengali" },
    Language { code: "bg", name: "Bulgarian" },
    Language { code: "ca", name: "Catalan" },
    Language { code: "zh-CN", name: "Chinese (Simplified)" },
    Language { code: "zh-TW", name: "Chinese (Traditional)" },
    Language { code: "hr", name: "Croatian" },
    Language { code: "cs", name: "Czech" },
    Language { code: "da", name: "Danish" },
    Language { code: "nl", name: "Dutch" },
    Language { code: "en", name: "English" },
    Language { code: "et", name: "Estonian" },
    Language { code: "fi", name: "Finnish" },
    Language { code: "fr", name: "French" },
    Language { code: "de", name: "German" },
    Language { code: "el", name: "Greek" },
    Language { code: "gu", name: "Gujarati" },
    Language { code: "he", name: "Hebrew" },
    Language { code: "hi", name: "Hindi" },
    Language { code: "hu", name: "Hungarian" },
    Language { code: "id", name: "Indonesian" },
    Language { code: "it", name: "Italian" },
    Language { code: "ja", name: "Japanese" },
    Language { code: "kn", name: "Kannada" },
    Language { code: "ko", name: "Korean" },
    Language { code: "lv", name: "Latvian" },
    Language { code: "lt", name: "Lithuanian" },
    Language { code: "ms", name: "Malay" },
    Language { code: "ml", name: "Malayalam" },
    Language { code: "mr", name: "Marathi" },
    Language { code: "ne", name: "Nepali" },
    Language { code: "no", name: "Norwegian" },
    Language { code: "ps", name: "Pashto" },
    Language { code: "fa", name: "Persian" },
    Language { code: "pl", name: "Polish" },
    Language { code: "pt", name: "Portuguese" },
    Language { code: "pa", name: "Punjabi" },
    Language { code: "ro", name: "Romanian" },
    Language { code: "ru", name: "Russian" },
    Language { code: "sr", name: "Serbian" },
    Language { code: "sd", name: "Sindhi" },
    Language { code: "sk", name: "Slovak" },
    Language { code: "sl", name: "Slovenian" },
    Language { code: "es", name: "Spanish" },
    Language { code: "sw", name: "Swahili" },
    Language { code: "sv", name: "Swedish" },
    Language { code: "ta", name: "Tamil" },
    Language { code: "te", name: "Telugu" },
    Language { code: "th", name: "Thai" },
    Language { code: "tr", name: "Turkish" },
    Language { code: "uk", name: "Ukrainian" },
    Language { code: "ur", name: "Urdu" },
    Language { code: "vi", name: "Vietnamese" },
];

/// Where a request goes: the language to write the translation in and, when the app knows it,
/// the language the text is in (otherwise the service detects it).
pub(super) struct Target {
    pub(super) language: &'static Language,
    pub(super) source: Option<&'static str>,
}

pub(super) fn find_language(code: &str) -> Option<&'static Language> {
    LANGUAGES.iter().find(|language| language.code == code)
}

/// The language a request asks for. A chosen `target_language` wins. Without one, the older
/// `direction` decides: Chinese into English or English into Chinese, and "auto" by the language
/// most of the text is in.
pub(super) fn resolve_target(
    direction: &str,
    target_language: Option<&str>,
    text: &str,
) -> Result<Target, String> {
    let chosen = target_language
        .map(str::trim)
        .filter(|code| !code.is_empty() && *code != "auto");
    if let Some(code) = chosen {
        let language =
            find_language(code).ok_or_else(|| format!("Unsupported translation language: {code}"))?;
        return Ok(Target { language, source: None });
    }
    let to_english = match direction {
        "zh-en" => true,
        "en-zh" => false,
        "auto" => direction::auto_target(text) == "en",
        _ => return Err("Unsupported translation direction.".to_string()),
    };
    let (target, source) = if to_english { ("en", "zh-CN") } else { ("zh-CN", "en") };
    // Both codes are in the table.
    find_language(target)
        .map(|language| Target { language, source: Some(source) })
        .ok_or_else(|| "Unsupported translation direction.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn code(target: Result<Target, String>) -> String {
        target.map(|target| target.language.code.to_string()).unwrap_or_else(|error| error)
    }

    #[test]
    fn a_chosen_language_wins_over_the_direction() {
        assert_eq!(code(resolve_target("auto", Some("ur"), "Hello there")), "ur");
        assert_eq!(code(resolve_target("zh-en", Some("fr"), "Hello there")), "fr");
        assert_eq!(code(resolve_target("auto", Some("zh-TW"), "Hello there")), "zh-TW");
        assert!(resolve_target("auto", Some("ur"), "Hello").unwrap().source.is_none());
    }

    #[test]
    fn without_a_chosen_language_the_direction_decides() {
        assert_eq!(code(resolve_target("zh-en", None, "x")), "en");
        assert_eq!(code(resolve_target("en-zh", None, "x")), "zh-CN");
        assert_eq!(code(resolve_target("auto", None, "The quick brown fox jumps over the lazy dog.")), "zh-CN");
        assert_eq!(code(resolve_target("auto", Some(""), "\u{4eca}\u{5929}\u{5929}\u{6c14}\u{5f88}\u{597d}")), "en");
        assert_eq!(code(resolve_target("auto", Some("auto"), "Hello there")), "zh-CN");
        assert_eq!(resolve_target("zh-en", None, "x").unwrap().source, Some("zh-CN"));
        assert_eq!(resolve_target("en-zh", None, "x").unwrap().source, Some("en"));
    }

    #[test]
    fn unknown_languages_and_directions_are_refused() {
        assert!(code(resolve_target("auto", Some("xx"), "Hello")).contains("Unsupported translation language: xx"));
        assert!(code(resolve_target("auto", Some("UR"), "Hello")).contains("Unsupported"));
        assert_eq!(code(resolve_target("sideways", None, "Hello")), "Unsupported translation direction.");
    }

    #[test]
    fn the_table_has_unique_codes_and_names_in_alphabetical_order() {
        let mut codes: Vec<_> = LANGUAGES.iter().map(|language| language.code).collect();
        codes.sort_unstable();
        codes.dedup();
        assert_eq!(codes.len(), LANGUAGES.len());
        assert!(LANGUAGES.iter().all(|language| !language.name.is_empty()));
        assert!(LANGUAGES.windows(2).all(|pair| pair[0].name < pair[1].name));
        assert_eq!(find_language("ur").map(|language| language.name), Some("Urdu"));
    }
}
