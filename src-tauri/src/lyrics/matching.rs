//! Telling whether lyrics found by name belong to the track that plays. Pure functions.

pub(super) const DURATION_TOLERANCE_MS: i64 = 3000;

const VERSION_WORDS: &[&str] = &["live", "remaster", "remastered", "version", "edit", "mix", "mono", "stereo"];

pub(super) fn fold(text: &str) -> String {
    let folded: String = text
        .chars()
        .map(|c| match c {
            '\u{FF01}'..='\u{FF5E}' => char::from_u32(c as u32 - 0xFEE0).unwrap_or(c),
            '\u{3000}' => ' ',
            _ => c,
        })
        .flat_map(char::to_lowercase)
        .collect();
    folded.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub(super) fn clean_title(title: &str) -> String {
    let mut text = fold(title);
    for open in ['(', '[', '\u{3010}', '\u{ff08}'] {
        if let Some(start) = text.find(open) {
            let inner = &text[start..];
            if VERSION_WORDS.iter().any(|word| inner.contains(word)) || inner.contains("feat") || inner.contains("ft.") {
                text.truncate(start);
            }
        }
    }
    if let Some((head, tail)) = text.split_once(" - ") {
        if VERSION_WORDS.iter().any(|word| tail.contains(word)) {
            text = head.to_string();
        }
    }
    for marker in [" feat. ", " feat ", " ft. "] {
        if let Some(start) = text.find(marker) {
            text.truncate(start);
        }
    }
    text.trim().to_string()
}

fn artist_names(artists: &str) -> Vec<String> {
    let folded = fold(artists);
    let mut names = Vec::new();
    let separators: &[&str] = &[", ", " & ", " / ", " feat. ", " feat ", " ft. ", "\u{3001}"];
    let mut current = vec![folded];
    for sep in separators {
        let mut next = Vec::new();
        for item in current {
            next.extend(item.split(sep).map(str::to_string));
        }
        current = next;
    }
    for name in current {
        let trimmed = name.trim().to_string();
        if !trimmed.is_empty() {
            names.push(trimmed);
        }
    }
    names
}

pub(super) fn same_artist(first: &str, second: &str) -> bool {
    let a = artist_names(first);
    let b = artist_names(second);
    if a.is_empty() || b.is_empty() {
        return true;
    }
    a.iter().any(|name_a| b.iter().any(|name_b| name_a == name_b))
}

/// Browsers report the length of their own copy (a video with an intro, say), so a second, wider
/// pass accepts lyrics whose title and artist match but whose length is further off.
pub(super) const RELAXED_DURATION_TOLERANCE_MS: i64 = 12_000;

pub(super) fn close_within(expected_ms: i64, actual_ms: i64, tolerance_ms: i64) -> bool {
    expected_ms <= 0 || (expected_ms - actual_ms).abs() <= tolerance_ms
}

/// The title as it is usually listed: everything in brackets ("(From 'Yuvraaj')", "[Official
/// Video]") and anything after " - " or " | " dropped. Used for searching and for comparing
/// titles from players that add such tails.
pub(super) fn core_title(title: &str) -> String {
    let mut kept = String::new();
    let mut depth = 0usize;
    for c in fold(title).chars() {
        match c {
            '(' | '[' | '\u{3010}' => depth += 1,
            ')' | ']' | '\u{3011}' => depth = depth.saturating_sub(1),
            _ if depth == 0 => kept.push(c),
            _ => {}
        }
    }
    let mut text = kept.split_whitespace().collect::<Vec<_>>().join(" ");
    for marker in [" - ", " | ", " feat. ", " feat ", " ft. "] {
        if let Some((head, _)) = text.split_once(marker) {
            text = head.to_string();
        }
    }
    text.trim().to_string()
}

/// The first of several artists ("Benny Dayal, Shreya Ghoshal" gives "benny dayal"), which is
/// what lyrics databases list a song under far more often than the full line.
pub(super) fn first_artist(artists: &str) -> String {
    artist_names(artists).into_iter().next().unwrap_or_default()
}

pub(super) fn stable_hash(text: &str) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;
    for byte in text.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0100_0000_01b3_u64);
    }
    hash
}

pub(super) fn cache_key(title: &str, artist: &str, duration_ms: i64) -> String {
    let clean = clean_title(title);
    // "v2": answers cached by the stricter lookup that missed songs should be asked about again.
    let rounded_duration = if duration_ms > 0 { duration_ms / 1000 } else { 0 };
    format!("v2|{clean}|{}|{rounded_duration}", fold(artist))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn core_title_drops_brackets_and_tails() {
        assert_eq!(core_title("Tu Meri Dost Hain (From 'Yuvraaj')"), "tu meri dost hain");
        assert_eq!(core_title("Tu Meri Dost Hain [Official Video]"), "tu meri dost hain");
        assert_eq!(core_title("Tu Meri Dost Hain - Topic"), "tu meri dost hain");
    }

    #[test]
    fn first_artist_takes_the_first_of_several() {
        assert_eq!(first_artist("Benny Dayal, Shreya Ghoshal"), "benny dayal");
        assert_eq!(first_artist(""), "");
    }

    #[test]
    fn wider_tolerance_accepts_a_longer_copy() {
        assert!(!close_within(240_000, 250_000, DURATION_TOLERANCE_MS));
        assert!(close_within(240_000, 250_000, RELAXED_DURATION_TOLERANCE_MS));
        assert!(close_within(0, 250_000, DURATION_TOLERANCE_MS));
    }
}
