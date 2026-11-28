//! Synced lyrics for the music page. Windows' media session gives the playing track's title,
//! artist, album and duration but no lyrics, so they are looked up: first in a folder of .lrc
//! files the user keeps (local.rs), then, only when the user turned online lyrics on, on LRCLIB
//! (lrclib.rs). Online answers, and "not found", are cached in `lyrics-cache/` in the app data
//! folder. The text is returned as LRC; the island parses it.

mod found;
mod local;
mod lrclib;
mod matching;

use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use found::FoundLyrics;
use matching::{cache_key, stable_hash};

const CACHE_DIR_NAME: &str = "lyrics-cache";
/// A track no source had lyrics for is asked about again after a week.
const MISSING_TTL: Duration = Duration::from_secs(7 * 24 * 60 * 60);
/// Past this many cached tracks, the oldest are removed.
const MAX_CACHED: usize = 2000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LyricsQuery {
    title: String,
    #[serde(default)]
    artist: String,
    #[serde(default)]
    album: String,
    #[serde(default)]
    duration_ms: i64,
    /// The user's folder of .lrc files; empty when none is set.
    #[serde(default)]
    folder: String,
    /// Whether LRCLIB may be asked.
    #[serde(default)]
    online: bool,
    /// The player's own id for the song, when it reports one.
    #[serde(default)]
    #[allow(dead_code, reason = "sent by the island (tests/regression/lyric-word-fill.tsx) for player-specific sources; LRCLIB and local files do not use it")]
    track_id: Option<String>,
    /// The playing app's AppUserModelId.
    #[serde(default)]
    #[allow(dead_code, reason = "sent by the island for player-specific sources; LRCLIB and local files do not use it")]
    source_app_id: Option<String>,
    /// Whether word-by-word lyrics are switched on.
    #[serde(default)]
    #[allow(dead_code, reason = "sent by the island for sources with word timing; LRCLIB and local files do not use it")]
    word_fill: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Lyrics {
    /// "local" or "lrclib".
    source: &'static str,
    /// Synced lyrics in LRC format.
    lrc: String,
    /// The translation of the same lines, in LRC, when the source has one.
    translation: Option<String>,
    /// The song's length as the source lists it, when known.
    duration_ms: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CacheEntry {
    key: String,
    lrc: Option<String>,
    #[serde(default)]
    source: Option<String>,
    #[serde(default)]
    translation: Option<String>,
    #[serde(default)]
    duration_ms: Option<i64>,
    fetched_at: u64,
}

type Answer = (&'static str, FoundLyrics);

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |time| time.as_secs())
}

fn cache_path(dir: &Path, key: &str) -> PathBuf {
    dir.join(format!("{:016x}.json", stable_hash(key)))
}

fn read_cache(dir: &Path, key: &str, now: u64) -> Option<Option<Answer>> {
    let entry: CacheEntry = serde_json::from_str(&fs::read_to_string(cache_path(dir, key)).ok()?).ok()?;
    if entry.key != key {
        return None;
    }
    match entry.lrc {
        Some(lrc) => {
            Some(Some(("lrclib", FoundLyrics { lrc, translation: entry.translation, duration_ms: entry.duration_ms })))
        }
        None if now.saturating_sub(entry.fetched_at) < MISSING_TTL.as_secs() => Some(None),
        None => None,
    }
}

fn write_cache(dir: &Path, key: &str, answer: Option<&Answer>, now: u64) {
    if fs::create_dir_all(dir).is_err() {
        return;
    }
    let entry = CacheEntry {
        key: key.to_string(),
        lrc: answer.map(|(_, found)| found.lrc.clone()),
        source: answer.map(|(source, _)| (*source).to_string()),
        translation: answer.and_then(|(_, found)| found.translation.clone()),
        duration_ms: answer.and_then(|(_, found)| found.duration_ms),
        fetched_at: now,
    };
    if let Ok(text) = serde_json::to_string(&entry) {
        let _ = fs::write(cache_path(dir, key), text);
    }
    prune_cache(dir, MAX_CACHED);
}

fn prune_cache(dir: &Path, keep: usize) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let mut files: Vec<(SystemTime, PathBuf)> = entries
        .flatten()
        .filter_map(|entry| Some((entry.metadata().ok()?.modified().ok()?, entry.path())))
        .collect();
    if files.len() <= keep {
        return;
    }
    files.sort();
    for (_, path) in &files[..files.len() - keep] {
        let _ = fs::remove_file(path);
    }
}

/// Synced lyrics for the playing track, or null when none were found.
#[tauri::command]
pub async fn get_lyrics(app: AppHandle, query: LyricsQuery) -> Result<Option<Lyrics>, String> {
    if query.title.trim().is_empty() {
        return Ok(None);
    }
    let folder = query.folder.trim().to_string();
    if !folder.is_empty() {
        let (title, artist) = (query.title.clone(), query.artist.clone());
        let found = tauri::async_runtime::spawn_blocking(move || local::find(Path::new(&folder), &title, &artist))
            .await
            .map_err(|error| format!("Failed to join the lyrics folder search: {error}"))?;
        if let Some(lrc) = found {
            return Ok(Some(Lyrics {
                source: "local",
                lrc,
                translation: None,
                duration_ms: None,
            }));
        }
    }
    if !query.online {
        return Ok(None);
    }
    let cache_dir = app.path().app_data_dir().map_err(|error| error.to_string())?.join(CACHE_DIR_NAME);
    let key = cache_key(&query.title, &query.artist, query.duration_ms);
    let now = now_secs();
    if let Some(cached) = read_cache(&cache_dir, &key, now) {
        if let Some((source, found)) = cached {
            return Ok(Some(Lyrics {
                source,
                lrc: found.lrc,
                translation: found.translation,
                duration_ms: found.duration_ms,
            }));
        }
        return Ok(None);
    }

    match lrclib::fetch(&query.title, &query.artist, &query.album, query.duration_ms).await {
        Ok(Some(found)) => {
            let answer = ("lrclib", found);
            write_cache(&cache_dir, &key, Some(&answer), now);
            Ok(Some(Lyrics {
                source: "lrclib",
                lrc: answer.1.lrc,
                translation: answer.1.translation,
                duration_ms: answer.1.duration_ms,
            }))
        }
        Ok(None) => {
            write_cache(&cache_dir, &key, None, now);
            Ok(None)
        }
        Err(error) => Err(error),
    }
}

/// This module's Tauri commands, chained into `lib.rs`'s `generate_handler!`.
macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::lyrics::get_lyrics,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;
