//! Daily todo Markdown export and its default directory.

use serde::Serialize;
use std::{fs, path::PathBuf};

use super::windows_home_dir;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTodoMarkdownResult {
    pub(super) file_path: String,
}

/// A day's date goes into file names, so it may only hold digits and dashes.
pub(super) fn is_todo_date(date: &str) -> bool {
    !date.is_empty() && date.chars().all(|ch| ch.is_ascii_digit() || ch == '-')
}

/// The file a day is saved to: `<directory>/<date>.md`.
fn todo_markdown_path(directory: &str, date: &str) -> Result<PathBuf, String> {
    let directory = directory.trim();

    if directory.is_empty() {
        return Err("Todo save path is empty.".to_string());
    }

    if !is_todo_date(date) {
        return Err("Todo date contains invalid filename characters.".to_string());
    }

    Ok(PathBuf::from(directory).join(format!("{date}.md")))
}

#[tauri::command]
pub fn save_todo_markdown(
    directory: String,
    date: String,
    content: String,
) -> Result<SaveTodoMarkdownResult, String> {
    let file_path = todo_markdown_path(&directory, &date)?;

    if let Some(directory_path) = file_path.parent() {
        fs::create_dir_all(directory_path).map_err(|error| error.to_string())?;
    }

    fs::write(&file_path, content).map_err(|error| error.to_string())?;

    Ok(SaveTodoMarkdownResult {
        file_path: file_path.to_string_lossy().to_string(),
    })
}

/// Opens a day's saved Markdown file in the app the system uses for `.md` files.
#[tauri::command]
pub async fn open_todo_markdown(directory: String, date: String) -> Result<(), String> {
    let file_path = todo_markdown_path(&directory, &date)?;

    if !file_path.is_file() {
        return Err("There is no saved markdown file for that day yet.".to_string());
    }

    let path = file_path.to_string_lossy().to_string();
    tauri_plugin_opener::open_path(&path, None::<&str>)
        .map_err(|error| format!("Failed to open {path}: {error}"))
}

#[tauri::command]
pub fn get_default_todo_save_directory() -> Result<String, String> {
    let home_dir = windows_home_dir()?;
    let documents = home_dir.join("Documents");
    let folder = documents.join("Skerry");
    Ok(folder.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::todo_markdown_path;

    #[test]
    fn a_day_is_saved_as_its_date_with_an_md_extension() {
        let path = todo_markdown_path("  notes  ", "2026-11-23").unwrap();
        assert_eq!(path.file_name().and_then(|name| name.to_str()), Some("2026-11-23.md"));
        assert_eq!(path.parent().and_then(|dir| dir.to_str()), Some("notes"));
    }

    #[test]
    fn an_empty_directory_is_refused() {
        assert!(todo_markdown_path("   ", "2026-11-23").is_err());
    }

    #[test]
    fn a_date_that_could_leave_the_directory_is_refused() {
        assert!(todo_markdown_path("notes", "../secret").is_err());
        assert!(todo_markdown_path("notes", "2026/11/23").is_err());
        assert!(todo_markdown_path("notes", "").is_err());
    }
}
