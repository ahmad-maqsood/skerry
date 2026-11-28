//! Synced lyrics from LRCLIB (https://lrclib.net), a free, open lyrics database with no key.

use std::time::Duration;

use serde::Deserialize;

use super::found::FoundLyrics;
use super::matching::{
    clean_title, close_within, core_title, first_artist, same_artist, DURATION_TOLERANCE_MS,
    RELAXED_DURATION_TOLERANCE_MS,
};
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

pub(super) fn best_match(
    records: &[Record],
    title: &str,
    artist: &str,
    duration_ms: i64,
    tolerance_ms: i64,
) -> Option<(String, i64)> {
    let clean = clean_title(title);
    let core = core_title(title);
    let same_title = |name: &str| {
        clean_title(name) == clean || (!core.is_empty() && core_title(name) == core)
    };
    records
        .iter()
        .filter(|record| record.synced_lyrics.as_deref().is_some_and(|lyrics| !lyrics.trim().is_empty()))
        .filter(|record| same_title(&record.track_name) && same_artist(&record.artist_name, artist))
        .filter(|record| close_within(duration_ms, (record.duration * 1000.0) as i64, tolerance_ms))
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

/// Runs one request. `Ok(None)` is a clean "nothing here"; `Err` means the answer is unknown (no
/// connection, a busy server), so the caller must not remember it as "no lyrics".
async fn get_json<T: serde::de::DeserializeOwned>(client: &reqwest::Client, url: reqwest::Url) -> Result<Option<T>, String> {
    let response = client.get(url).send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    if status.is_success() {
        return Ok(response.json::<T>().await.ok());
    }
    if status.is_server_error() || status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err(format!("LRCLIB answered {status}"));
    }
    Ok(None)
}

fn found_from(record: Record) -> Option<FoundLyrics> {
    let lrc = record.synced_lyrics.filter(|lrc| !lrc.trim().is_empty())?;
    Some(FoundLyrics {
        lrc,
        translation: None,
        duration_ms: (record.duration > 0.0).then_some((record.duration * 1000.0) as i64),
    })
}

pub(super) async fn fetch(title: &str, artist: &str, album: &str, duration_ms: i64) -> Result<Option<FoundLyrics>, String> {
    let client = client()?;
    let duration_secs = (duration_ms > 0).then_some((duration_ms as f64 / 1000.0).round() as i64);
    let core = core_title(title);
    let search_title = if core.is_empty() { title.to_string() } else { core };
    let lead_artist = first_artist(artist);
    // Set when a request could not be answered, so that "found nothing" is not trusted as final.
    let mut failure: Option<String> = None;

    // 1. Exact lookups: the player's own text first, then the cleaned title with the first artist
    //    (browsers add "(From ...)" tails and list every singer; databases usually do not).
    let mut attempts: Vec<(String, String, bool)> = vec![(title.to_string(), artist.to_string(), true)];
    if search_title != title || (!lead_artist.is_empty() && lead_artist != artist) {
        attempts.push((search_title.clone(), if lead_artist.is_empty() { artist.to_string() } else { lead_artist.clone() }, false));
    }
    for (track, singer, with_album) in attempts {
        let mut params = vec![("track_name", track), ("artist_name", singer)];
        if with_album && !album.is_empty() {
            params.push(("album_name", album.to_string()));
        }
        if let Some(duration) = duration_secs {
            params.push(("duration", duration.to_string()));
        }
        let url = reqwest::Url::parse_with_params(&format!("{BASE}/get"), &params).map_err(|error| error.to_string())?;
        match get_json::<Record>(&client, url).await {
            Ok(Some(record)) => {
                if let Some(found) = found_from(record) {
                    return Ok(Some(found));
                }
            }
            Ok(None) => {}
            Err(error) => failure = Some(error),
        }
    }

    // 2. Searches: by title and first artist, then by the title alone. A closely timed match is
    //    taken first; failing that, one whose length is further off (browsers report their own).
    let mut queries = Vec::new();
    if !lead_artist.is_empty() {
        queries.push(format!("{search_title} {lead_artist}"));
    }
    queries.push(search_title.clone());
    let mut records: Vec<Record> = Vec::new();
    for query in queries {
        let url = reqwest::Url::parse_with_params(&format!("{BASE}/search"), [("q", query)]).map_err(|error| error.to_string())?;
        match get_json::<Vec<Record>>(&client, url).await {
            Ok(Some(mut batch)) => records.append(&mut batch),
            Ok(None) => {}
            Err(error) => failure = Some(error),
        }
        if best_match(&records, title, artist, duration_ms, DURATION_TOLERANCE_MS).is_some() {
            break;
        }
    }
    for tolerance in [DURATION_TOLERANCE_MS, RELAXED_DURATION_TOLERANCE_MS] {
        if let Some((lrc, duration)) = best_match(&records, title, artist, duration_ms, tolerance) {
            return Ok(Some(FoundLyrics { lrc, translation: None, duration_ms: (duration > 0).then_some(duration) }));
        }
    }

    match failure {
        Some(error) => Err(error),
        None => Ok(None),
    }
}
