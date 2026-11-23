//! The daily Markdown files already saved in the todo save directory.

use serde::Serialize;
use std::{fs, io::ErrorKind};

/// The newest days listed; older files stay on disk and can still be opened from there.
const MAX_LISTED_DAYS: usize = 400;

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TodoMarkdownFile {
    /// Local date, YYYY-MM-DD.
    pub(super) date: String,
    pub(super) file_path: String,
}

/// `2026-11-23.md` is the file of `2026-11-23`; any other name is not a day's file.
fn day_of_file_name(name: &str) -> Option<&str> {
    let date = name.strip_suffix(".md")?;
    let is_date = date.len() == 10
        && date.bytes().enumerate().all(|(index, byte)| {
            if index == 4 || index == 7 {
                byte == b'-'
            } else {
                byte.is_ascii_digit()
            }
        });
    is_date.then_some(date)
}

/// The days saved in `directory`, newest first. A folder that does not exist yet holds none.
fn list_days(directory: &str) -> Result<Vec<TodoMarkdownFile>, String> {
    let directory = directory.trim();

    if directory.is_empty() {
        return Err("Todo save path is empty.".to_string());
    }

    let entries = match fs::read_dir(directory) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("Could not read {directory}: {error}")),
    };

    let mut files: Vec<TodoMarkdownFile> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_name = entry.file_name();
            let date = day_of_file_name(file_name.to_str()?)?;
            entry.file_type().ok()?.is_file().then(|| TodoMarkdownFile {
                date: date.to_string(),
                file_path: entry.path().to_string_lossy().to_string(),
            })
        })
        .collect();

    files.sort_by(|a, b| b.date.cmp(&a.date));
    files.truncate(MAX_LISTED_DAYS);
    Ok(files)
}

#[tauri::command]
pub async fn list_todo_markdown_files(directory: String) -> Result<Vec<TodoMarkdownFile>, String> {
    list_days(&directory)
}

/// Opens the save folder in the file manager, making it first if it is not there yet.
#[tauri::command]
pub async fn open_todo_folder(directory: String) -> Result<(), String> {
    let directory = directory.trim();

    if directory.is_empty() {
        return Err("Todo save path is empty.".to_string());
    }

    fs::create_dir_all(directory).map_err(|error| format!("Could not create {directory}: {error}"))?;
    tauri_plugin_opener::open_path(directory, None::<&str>)
        .map_err(|error| format!("Could not open {directory}: {error}"))
}

#[cfg(test)]
mod tests {
    use super::{day_of_file_name, list_days};
    use std::fs;

    #[test]
    fn only_date_named_markdown_files_are_days() {
        assert_eq!(day_of_file_name("2026-11-23.md"), Some("2026-11-23"));
        assert_eq!(day_of_file_name("2026-11-23.txt"), None);
        assert_eq!(day_of_file_name("2026-11-23.md.bak"), None);
        assert_eq!(day_of_file_name("notes.md"), None);
        assert_eq!(day_of_file_name("2026-1-3.md"), None);
        assert_eq!(day_of_file_name("2026_11_23.md"), None);
    }

    #[test]
    fn days_come_newest_first_and_skip_other_files() {
        let directory = std::env::temp_dir().join(format!("skerry-history-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).unwrap();
        for name in ["2026-11-20.md", "2026-11-23.md", "2026-11-21.md", "readme.md", "2026-11-22.txt"] {
            fs::write(directory.join(name), "x").unwrap();
        }
        fs::create_dir_all(directory.join("2026-11-19.md")).unwrap();

        let days: Vec<String> = list_days(directory.to_str().unwrap())
            .unwrap()
            .into_iter()
            .map(|file| file.date)
            .collect();
        let _ = fs::remove_dir_all(&directory);

        assert_eq!(days, ["2026-11-23", "2026-11-21", "2026-11-20"]);
    }

    #[test]
    fn a_missing_folder_holds_no_days_and_an_empty_path_is_refused() {
        assert!(list_days("this-folder-does-not-exist-skerry").unwrap().is_empty());
        assert!(list_days("  ").is_err());
    }
}
