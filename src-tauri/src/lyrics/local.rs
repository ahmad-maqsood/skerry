//! Lyrics from a folder of .lrc files the user keeps, named "Artist - Title.lrc",
//! "Title - Artist.lrc" or "Title.lrc". Only the folder itself is searched, not its subfolders.

use std::{fs, path::Path};

use super::matching::{clean_title, fold, same_artist};

/// .lrc files larger than this are not lyrics.
const MAX_FILE_BYTES: u64 = 512 * 1024;

/// How well a file stem names the track: 2 for title and artist, 1 for the title alone.
pub(super) fn stem_score(stem: &str, title: &str, artist: &str) -> u8 {
    let title = clean_title(title);
    if title.is_empty() {
        return 0;
    }
    let stem = fold(stem);
    let named = |part: &str| clean_title(part) == title;
    if let Some((left, right)) = stem.split_once(" - ") {
        if (named(right) && !artist.is_empty() && same_artist(left, artist))
            || (named(left) && !artist.is_empty() && same_artist(right, artist))
        {
            return 2;
        }
    }
    u8::from(named(&stem))
}

/// The text of the best-named .lrc file in `folder`; a title-only name is used only when it is
/// the only file with that title.
pub(super) fn find(folder: &Path, title: &str, artist: &str) -> Option<String> {
    let mut best: Option<(u8, std::path::PathBuf)> = None;
    let mut title_only = 0;
    for entry in fs::read_dir(folder).ok()?.flatten() {
        let path = entry.path();
        let is_lrc = path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("lrc"));
        let small = entry.metadata().is_ok_and(|meta| meta.is_file() && meta.len() <= MAX_FILE_BYTES);
        if !is_lrc || !small {
            continue;
        }
        let Some(stem) = path.file_stem().map(|stem| stem.to_string_lossy().to_string()) else {
            continue;
        };
        let score = stem_score(&stem, title, artist);
        if score == 1 {
            title_only += 1;
        }
        if score > best.as_ref().map_or(0, |(score, _)| *score) {
            best = Some((score, path));
        }
    }
    let (score, path) = best?;
    if score == 1 && title_only > 1 {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    // Some .lrc files are saved with a byte order mark.
    let text = String::from_utf8_lossy(&bytes).trim_start_matches('\u{feff}').to_string();
    Some(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_names_are_scored_by_title_and_artist() {
        assert_eq!(stem_score("Jay - Sunny", "Sunny", "Jay"), 2);
        assert_eq!(stem_score("Sunny - Jay", "Sunny (Live)", "Jay"), 2);
        assert_eq!(stem_score("Sunny", "Sunny", "Jay"), 1);
        assert_eq!(stem_score("Someone Else - Sunny", "Sunny", "Jay"), 0);
        assert_eq!(stem_score("Orange Jasmine", "Sunny", "Jay"), 0);
    }

    #[test]
    fn the_folder_gives_the_named_file_and_never_guesses_between_two() {
        let folder = std::env::temp_dir().join(format!("skerry-lyrics-{}", std::process::id()));
        fs::create_dir_all(folder.join("sub")).unwrap();
        fs::write(folder.join("Jay - Sunny.lrc"), "\u{feff}[00:01.00]Little Yellow Flower").unwrap();
        fs::write(folder.join("Orange Jasmine.lrc"), "[00:01.00]Sparrows Outside the Window").unwrap();
        fs::write(folder.join("sub").join("Rice Fragrance.lrc"), "[00:01.00]To This World").unwrap();
        assert_eq!(find(&folder, "Sunny", "Jay").as_deref(), Some("[00:01.00]Little Yellow Flower"));
        assert_eq!(find(&folder, "Orange Jasmine", "Jay").as_deref(), Some("[00:01.00]Sparrows Outside the Window"));
        assert_eq!(find(&folder, "Rice Fragrance", "Jay"), None);
        fs::write(folder.join("Orange Jasmine - Someone Else.lrc"), "x").unwrap();
        fs::write(folder.join("Orange Jasmine (Live).lrc"), "y").unwrap();
        assert_eq!(find(&folder, "Orange Jasmine", "Jay"), None);
        assert_eq!(find(&folder.join("missing"), "Sunny", "Jay"), None);
        fs::remove_dir_all(&folder).unwrap();
    }
}
