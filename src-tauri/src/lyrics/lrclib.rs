//! Synced lyrics from LRCLIB (https://lrclib.net), a free, open lyrics database with no key.

use std::time::Duration;

use serde::Deserialize;

use super::found::FoundLyrics;
use super::matching::{clean_title, close_duration, same_artist};
use crate::system::updater::get_updater_proxy;

const BASE: &str = "https://lrclib.net/api";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);
const USER_AGENT: &str = concat!("Skerry/", env!("CARGO_PKG_VERSION"), " (https://github.com/ahmad-maqsood/skerry-island)");

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Record {
    #[serde(default)]
    track_name: String,
    #[serde(default)]
    artist_name: String,
    /// Seconds.
    #[serde(default)]
    duration: f64,
    synced_lyrics: Option<String>,
}

pub(super) fn best_match(records: &[Record], title: &str, artist: &str, duration_ms: i64) -> Option<(String, i64)> {
    let clean = clean_title(title);
    records
        .iter()
        .filter(|record| record.synced_lyrics.as_deref().is_some_and(|lyrics| !lyrics.trim().is_empty()))
        .filter(|record| clean_title(&record.track_name) == clean && same_artist(&record.artist_name, artist))
        .filter(|record| close_duration(duration_ms, (record.duration * 1000.0) as i64))
        .min_by_key(|record| {
            (duration_ms - (record.duration * 1000.0) as i64).abs()
        })
        .and_then(|record| Some((record.synced_lyrics.clone()?, (record.duration * 1000.0) as i64)))
}

fn client() -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(REQUEST_TIMEOUT);
    if let Some(proxy_url) = get_updater_proxy() {
        if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
            builder = builder.proxy(proxy);
        }
    }
    builder.build().map_err(|error| error.to_string())
}

pub(super) async fn fetch(title: &str, artist: &str, album: &str, duration_ms: i64) -> Result<Option<FoundLyrics>, String> {
    let client = client()?;
    let duration_secs = (duration_ms > 0).then_some((duration_ms as f64 / 1000.0).round() as i64);

    let mut params = vec![("track_name", title.to_string()), ("artist_name", artist.to_string())];
    if !album.is_empty() {
        params.push(("album_name", album.to_string()));
    }
    if let Some(duration) = duration_secs {
        params.push(("duration", duration.to_string()));
    }
    let get_url = reqwest::Url::parse_with_params(&format!("{BASE}/get"), &params).map_err(|error| error.to_string())?;

    if let Ok(response) = client.get(get_url).send().await {
        if response.status().is_success() {
            if let Ok(record) = response.json::<Record>().await {
                if let Some(lrc) = record.synced_lyrics {
                    if !lrc.trim().is_empty() {
                        return Ok(Some(FoundLyrics {
                            lrc,
                            translation: None,
                            duration_ms: (record.duration > 0.0).then_some((record.duration * 1000.0) as i64),
                        }));
                    }
                }
            }
        }
    }

    // Fall back to /api/search
    let search_url = reqwest::Url::parse_with_params(&format!("{BASE}/search"), [("q", format!("{title} {artist}"))])
        .map_err(|error| error.to_string())?;

    if let Ok(response) = client.get(search_url).send().await {
        if response.status().is_success() {
            if let Ok(records) = response.json::<Vec<Record>>().await {
                if let Some((lrc, duration)) = best_match(&records, title, artist, duration_ms) {
                    return Ok(Some(FoundLyrics {
                        lrc,
                        translation: None,
                        duration_ms: (duration > 0).then_some(duration),
                    }));
                }
            }
        }
    }

    Ok(None)
}
