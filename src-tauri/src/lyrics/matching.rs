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

pub(super) fn close_duration(expected_ms: i64, actual_ms: i64) -> bool {
    expected_ms <= 0 || (expected_ms - actual_ms).abs() <= DURATION_TOLERANCE_MS
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
    let rounded_duration = if duration_ms > 0 { duration_ms / 1000 } else { 0 };
    format!("{clean}|{}|{rounded_duration}", fold(artist))
}
