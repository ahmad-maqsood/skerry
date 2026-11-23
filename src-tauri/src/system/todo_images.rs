//! Images pasted into the daily note: saved in `assets/` next to the day's Markdown file,
//! so the note's `![image](assets/...)` lines show them in any Markdown editor.

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::{
    fs,
    io::{ErrorKind, Write},
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use super::todo_export::is_todo_date;

const IMAGES_FOLDER: &str = "assets";
const MAX_IMAGE_BYTES: usize = 25 * 1024 * 1024;
const MAX_NAME_LEN: usize = 100;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedNoteImage {
    /// Where the note refers to it, relative to the Markdown file: `assets/<name>`.
    pub(super) relative_path: String,
    pub(super) file_path: String,
}

/// The extension and MIME type of an image, told by its first bytes.
fn sniff_image(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(("png", "image/png"))
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("jpg", "image/jpeg"))
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        Some(("gif", "image/gif"))
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP".as_slice()) {
        Some(("webp", "image/webp"))
    } else if bytes.starts_with(b"BM") {
        Some(("bmp", "image/bmp"))
    } else {
        None
    }
}

/// The file name in `assets/<name>`, or None for anything that could point elsewhere.
fn image_file_name(relative_path: &str) -> Option<&str> {
    let name = relative_path.strip_prefix("assets/")?;
    let is_plain = !name.is_empty()
        && name.len() <= MAX_NAME_LEN
        && !name.starts_with('.')
        && name
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_'));
    is_plain.then_some(name)
}

fn require_directory(directory: &str) -> Result<&str, String> {
    let directory = directory.trim();

    if directory.is_empty() {
        Err("Todo save path is empty.".to_string())
    } else {
        Ok(directory)
    }
}

fn save_image(directory: &str, date: &str, data: &str) -> Result<SavedNoteImage, String> {
    let directory = require_directory(directory)?;

    if !is_todo_date(date) {
        return Err("Todo date contains invalid filename characters.".to_string());
    }

    let bytes = STANDARD
        .decode(data.trim())
        .map_err(|_| "The pasted image could not be read.".to_string())?;

    if bytes.is_empty() || bytes.len() > MAX_IMAGE_BYTES {
        return Err("The pasted image is empty or larger than 25 MB.".to_string());
    }

    let (extension, _) = sniff_image(&bytes)
        .ok_or("The pasted file is not a PNG, JPEG, GIF, WebP or BMP image.".to_string())?;
    let folder = PathBuf::from(directory).join(IMAGES_FOLDER);
    fs::create_dir_all(&folder).map_err(|error| error.to_string())?;

    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis())
        .unwrap_or(0);

    // A paste never replaces an earlier one: a taken name gets a counter.
    for attempt in 0..1000u32 {
        let counter = if attempt == 0 { String::new() } else { format!("-{attempt}") };
        let name = format!("{date}-{stamp}{counter}.{extension}");
        let path = folder.join(&name);

        match fs::OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                file.write_all(&bytes).map_err(|error| error.to_string())?;
                return Ok(SavedNoteImage {
                    relative_path: format!("{IMAGES_FOLDER}/{name}"),
                    file_path: path.to_string_lossy().to_string(),
                });
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(error.to_string()),
        }
    }

    Err("Could not find a free file name for the pasted image.".to_string())
}

fn read_image(directory: &str, relative_path: &str) -> Result<String, String> {
    let directory = require_directory(directory)?;
    let name = image_file_name(relative_path).ok_or("That is not a pasted note image.".to_string())?;
    let path = PathBuf::from(directory).join(IMAGES_FOLDER).join(name);
    let length = fs::metadata(&path).map_err(|error| error.to_string())?.len();

    if length > MAX_IMAGE_BYTES as u64 {
        return Err("The image is larger than 25 MB.".to_string());
    }

    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let (_, mime) = sniff_image(&bytes).ok_or("The file is not a supported image.".to_string())?;
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

/// Saves an image pasted into the note (base64) and returns the path the note should refer to.
#[tauri::command]
pub async fn save_todo_note_image(
    directory: String,
    date: String,
    data: String,
) -> Result<SavedNoteImage, String> {
    save_image(&directory, &date, &data)
}

/// A saved note image as a data URL, for the thumbnails under the note.
#[tauri::command]
pub async fn read_todo_note_image(directory: String, relative_path: String) -> Result<String, String> {
    read_image(&directory, &relative_path)
}

#[cfg(test)]
mod tests {
    use super::{image_file_name, read_image, save_image, sniff_image};
    use std::fs;

    // A 1x1 PNG.
    const PNG: &str = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";

    #[test]
    fn images_are_told_by_their_first_bytes() {
        assert_eq!(sniff_image(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0]).map(|kind| kind.0), Some("png"));
        assert_eq!(sniff_image(&[0xFF, 0xD8, 0xFF, 0xE0]).map(|kind| kind.0), Some("jpg"));
        assert_eq!(sniff_image(b"GIF89a....").map(|kind| kind.0), Some("gif"));
        assert_eq!(sniff_image(b"RIFF\0\0\0\0WEBPVP8 ").map(|kind| kind.0), Some("webp"));
        assert_eq!(sniff_image(b"<svg></svg>"), None);
        assert_eq!(sniff_image(b"RIFF\0\0\0\0WAVE"), None);
        assert_eq!(sniff_image(&[]), None);
    }

    #[test]
    fn only_plain_names_inside_assets_are_read() {
        assert_eq!(image_file_name("assets/2026-11-23-1.png"), Some("2026-11-23-1.png"));
        assert_eq!(image_file_name("assets/../secret.png"), None);
        assert_eq!(image_file_name("assets/a/b.png"), None);
        assert_eq!(image_file_name("assets/.hidden.png"), None);
        assert_eq!(image_file_name("other/a.png"), None);
        assert_eq!(image_file_name("assets/"), None);
        assert_eq!(image_file_name("assets/a b.png"), None);
    }

    #[test]
    fn a_pasted_image_is_saved_under_assets_and_read_back() {
        let directory = std::env::temp_dir().join(format!("skerry-image-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        let dir = directory.to_str().unwrap();

        let first = save_image(dir, "2026-11-23", PNG).unwrap();
        let second = save_image(dir, "2026-11-23", PNG).unwrap();
        assert!(first.relative_path.starts_with("assets/2026-11-23-") && first.relative_path.ends_with(".png"));
        assert_ne!(first.relative_path, second.relative_path);
        assert!(read_image(dir, &first.relative_path).unwrap().starts_with("data:image/png;base64,"));
        assert!(save_image(dir, "../x", PNG).is_err());
        assert!(save_image(dir, "2026-11-23", "bm90IGFuIGltYWdl").is_err());
        assert!(save_image(dir, "2026-11-23", "***").is_err());
        assert!(read_image(dir, "assets/../x.png").is_err());
        let _ = fs::remove_dir_all(&directory);
    }
}
