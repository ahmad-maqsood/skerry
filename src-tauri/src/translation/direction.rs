//! Which way "auto" translates: into English when the text contains non-Latin characters,
//! or into the target language otherwise.

/// Han characters carry about as much as 1.5 Latin words, so a text counts as
/// foreign once it has at least this many Han characters per Latin word.
const HAN_PER_WORD: f64 = 1.5;

/// The language "auto" translates `text` into: "en" or "zh".
pub(super) fn auto_target(text: &str) -> &'static str {
    let (han, words) = count_scripts(text);
    let is_foreign = if han == 0 && words == 0 {
        // Only code, links, numbers or punctuation: any Han character at all decides it.
        text.chars().any(is_han)
    } else {
        han as f64 >= words as f64 * HAN_PER_WORD
    };
    if is_foreign {
        "en"
    } else {
        "zh"
    }
}

/// Han characters and Latin words in the prose of `text`, leaving out code in
/// backticks, links and email addresses, which stay as they are in any language.
fn count_scripts(text: &str) -> (usize, usize) {
    let mut prose = String::with_capacity(text.len());
    let mut in_code = false;
    for ch in text.chars() {
        if ch == '`' {
            in_code = !in_code;
            prose.push(' ');
        } else if in_code {
            continue;
        } else if matches!(ch, '\u{3000}'..='\u{303F}' | '\u{FF00}'..='\u{FF0F}' | '\u{FF1A}'..='\u{FF20}') {
            // Fullwidth punctuation sits against the next word without a space; split
            // there so a link after a fullwidth colon does not take the preceding text along.
            prose.push(' ');
        } else {
            prose.push(ch);
        }
    }

    let (mut han, mut words) = (0, 0);
    for token in prose.split_whitespace().filter(|token| !is_link_or_address(token)) {
        let mut in_word = false;
        for ch in token.chars() {
            if is_han(ch) {
                han += 1;
                in_word = false;
            } else if is_latin_letter(ch) {
                if !in_word {
                    words += 1;
                }
                in_word = true;
            } else {
                in_word = false;
            }
        }
    }
    (han, words)
}

fn is_link_or_address(token: &str) -> bool {
    let lower = token.to_ascii_lowercase();
    lower.contains("://")
        || lower.starts_with("www.")
        || token
            .split_once('@')
            .is_some_and(|(name, domain)| !name.is_empty() && domain.contains('.'))
}

fn is_latin_letter(ch: char) -> bool {
    ch.is_ascii_alphabetic() || (ch.is_alphabetic() && ('\u{00C0}'..='\u{024F}').contains(&ch))
}

fn is_han(ch: char) -> bool {
    matches!(ch,
        '\u{3400}'..='\u{4DBF}'   // Extension A
        | '\u{4E00}'..='\u{9FFF}' // Unified Ideographs
        | '\u{F900}'..='\u{FAFF}' // Compatibility Ideographs
        | '\u{20000}'..='\u{2EBEF}')
}

#[cfg(test)]
mod tests {
    use super::auto_target;

    #[test]
    fn plain_texts_go_to_the_other_language() {
        assert_eq!(auto_target("The quick brown fox jumps over the lazy dog."), "zh");
        assert_eq!(auto_target("\u{4eca}\u{5929}\u{5929}\u{6c14}\u{5f88}\u{597d}\u{ff0c}\u{6211}\u{4eec}\u{53bb}\u{516c}\u{56ed}\u{6563}\u{6b65}\u{5427}\u{3002}"), "en");
    }

    #[test]
    fn a_long_english_text_with_a_little_foreign_goes_to_foreign() {
        let text = "Our team met with \u{5f20}\u{4f1f} from the Shanghai office to review the quarterly \
            roadmap. We agreed to ship the new onboarding flow first, then revisit the \
            pricing page (\u{5b9a}\u{4ef7}\u{9875}) once the analytics are in.";
        assert_eq!(auto_target(text), "zh");
        assert_eq!(auto_target("Please call me \u{5c0f}\u{660e}, thanks!"), "zh");
    }

    #[test]
    fn foreign_with_english_terms_goes_to_english() {
        assert_eq!(auto_target("\u{6211}\u{5728}\u{7528} React \u{548c} TypeScript \u{5199}\u{4e00}\u{4e2a}\u{684c}\u{9762}\u{5e94}\u{7528}\u{3002}"), "en");
        assert_eq!(auto_target("\u{8fd9}\u{4e2a} bug \u{53ea}\u{5728} production environment \u{91cc}\u{51fa}\u{73b0}"), "en");
    }

    #[test]
    fn code_links_numbers_and_addresses_do_not_count() {
        let text = "\u{8bf7}\u{770b}\u{8fd9}\u{4e2a}\u{51fd}\u{6570} `fn parse_shortcut_binding(shortcut: &str) -> Option<Binding>` \
            \u{7684}\u{8bf4}\u{660e}\u{ff1a}https://docs.example.com/very/long/english/path?with=query \u{6216}\u{8005}\u{53d1}\u{90ae}\u{4ef6}\u{5230} \
            someone@example.com\u{ff0c}\u{7248}\u{672c} 3.0.1\u{3002}";
        assert_eq!(auto_target(text), "en");
        assert_eq!(auto_target("See https://\u{4f8b}\u{5b50}.cn/\u{6587}\u{6863} for details on the release notes."), "zh");
    }

    #[test]
    fn texts_without_words_fall_back_to_any_foreign() {
        assert_eq!(auto_target("12345 + 67890 = ?"), "zh");
        assert_eq!(auto_target("`\u{4ee3}\u{7801}` 123"), "en");
    }
}
