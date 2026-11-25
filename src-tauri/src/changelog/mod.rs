//! Release notes for Settings → Changelog: the descriptions of Skerry's published GitHub releases.
//!
//! They come from the newest release's changelog.json (scripts/release/changelog-json.mjs), a plain
//! file download. GitHub's API is only the fallback: it allows an unsigned-in IP address 60
//! requests an hour, and users behind a shared address found that already used up.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::system::updater::get_updater_proxy;

const CHANGELOG_URL: &str = "https://github.com/ahmad-maqsood/skerry-island/releases/latest/download/changelog.json";
const RELEASES_URL: &str = "https://api.github.com/repos/ahmad-maqsood/skerry-island/releases";
const RELEASES_PER_PAGE: &str = "30";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);
/// The most a response may hold; thirty descriptions are far smaller.
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;
const USER_AGENT: &str = concat!("Skerry/", env!("CARGO_PKG_VERSION"), " (https://github.com/ahmad-maqsood/skerry-island)");

/// One published release. Mirrored by ReleaseNote in features/changelog/api.ts.
#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseNote {
    tag: String,
    name: String,
    body: String,
    /// ISO 8601, as GitHub writes it; empty when the release has no date.
    published_at: String,
    url: String,
    prerelease: bool,
}

#[derive(Deserialize)]
struct GithubRelease {
    #[serde(default)]
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    published_at: Option<String>,
    #[serde(default)]
    html_url: String,
    #[serde(default)]
    draft: bool,
    #[serde(default)]
    prerelease: bool,
}

/// The releases a visitor can see, newest first as GitHub lists them. Drafts and entries without a
/// tag are left out, and a release without a title takes its tag as one.
fn parse_releases(data: &[u8]) -> Result<Vec<ReleaseNote>, String> {
    let releases: Vec<GithubRelease> =
        serde_json::from_slice(data).map_err(|error| format!("Invalid release list: {error}"))?;
    Ok(releases
        .into_iter()
        .filter(|release| !release.draft && !release.tag_name.trim().is_empty())
        .map(|release| {
            let tag = release.tag_name.trim().to_string();
            let name = release
                .name
                .map(|name| name.trim().to_string())
                .filter(|name| !name.is_empty())
                .unwrap_or_else(|| tag.clone());
            ReleaseNote {
                tag,
                name,
                body: release.body.unwrap_or_default().replace("\r\n", "\n").trim().to_string(),
                published_at: release.published_at.unwrap_or_default(),
                url: release.html_url,
                prerelease: release.prerelease,
            }
        })
        .collect())
}

/// The message for a response GitHub gave because the caller sent too many requests, or `None` for
/// any other answer. 429 always means that; 403 only when the rate limit header says none are left
/// (or a retry time is given), since GitHub also answers 403 for other refusals.
fn rate_limit_message(status: u16, remaining: Option<&str>, retry_after: Option<&str>) -> Option<String> {
    let limited = status == 429 || (status == 403 && (remaining.map(str::trim) == Some("0") || retry_after.is_some()));
    if !limited {
        return None;
    }
    let minutes = retry_after
        .and_then(|value| value.trim().parse::<u64>().ok())
        .map(|seconds| seconds.div_ceil(60).max(1));
    Some(match minutes {
        Some(1) => "GitHub is limiting requests right now. Try again in a minute.".to_string(),
        Some(minutes) => format!("GitHub is limiting requests right now. Try again in {minutes} minutes."),
        None => "GitHub is limiting requests right now. Try again in a few minutes.".to_string(),
    })
}

fn client() -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder().user_agent(USER_AGENT).timeout(REQUEST_TIMEOUT);
    if let Some(proxy_url) = get_updater_proxy() {
        if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
            builder = builder.proxy(proxy);
        }
    }
    builder.build().map_err(|error| format!("Could not create the request: {error}"))
}

fn api_url() -> Result<reqwest::Url, String> {
    // reqwest is built without its query feature, so the parameter goes into the URL by hand.
    reqwest::Url::parse_with_params(RELEASES_URL, [("per_page", RELEASES_PER_PAGE)])
        .map_err(|error| error.to_string())
}

async fn download(url: reqwest::Url) -> Result<Vec<u8>, String> {
    let response = client()?
        .get(url)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Could not reach GitHub: {error}"))?;
    let header = |name: &str| response.headers().get(name).and_then(|value| value.to_str().ok());
    if let Some(message) = rate_limit_message(response.status().as_u16(), header("x-ratelimit-remaining"), header("retry-after")) {
        return Err(message);
    }
    let mut response = response
        .error_for_status()
        .map_err(|error| format!("GitHub did not return the releases: {error}"))?;
    let mut data = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("Could not read the releases: {error}"))?
    {
        if data.len() + chunk.len() > MAX_RESPONSE_BYTES {
            return Err("The release list is too large.".into());
        }
        data.extend_from_slice(&chunk);
    }
    Ok(data)
}

#[tauri::command]
pub async fn fetch_release_notes() -> Result<Vec<ReleaseNote>, String> {
    match published_changelog().await {
        Ok(releases) => Ok(releases),
        // A release from before changelog.json, or a damaged file: ask the API instead.
        Err(error) => {
            eprintln!("changelog.json was not usable, asking the GitHub API: {error}");
            parse_releases(&download(api_url()?).await?)
        }
    }
}

async fn published_changelog() -> Result<Vec<ReleaseNote>, String> {
    let url = reqwest::Url::parse(CHANGELOG_URL).map_err(|error| error.to_string())?;
    parse_releases(&download(url).await?)
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)* crate::changelog::fetch_release_notes,] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_published_releases_and_skips_drafts() {
        let list = parse_releases(
            br###"[
              {"tag_name":"v1.2.0","name":"Skerry 1.2","body":"## What's new\r\n\r\n- A\r\n","published_at":"2026-11-20T10:00:00Z","html_url":"https://github.com/x/y/releases/tag/v1.2.0","draft":false,"prerelease":false},
              {"tag_name":"v1.3.0","name":"Soon","body":"x","draft":true},
              {"tag_name":"v1.1.0-beta.1","name":null,"body":null,"published_at":null,"html_url":"u","prerelease":true},
              {"tag_name":"  ","name":"No tag"}
            ]"###,
        )
        .unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].tag, "v1.2.0");
        assert_eq!(list[0].name, "Skerry 1.2");
        assert_eq!(list[0].body, "## What's new\n\n- A");
        assert_eq!(list[0].published_at, "2026-11-20T10:00:00Z");
        assert!(!list[0].prerelease);
        // No title, no body, no date: the tag stands in for the title and the rest is empty.
        assert_eq!(list[1].name, "v1.1.0-beta.1");
        assert_eq!(list[1].body, "");
        assert_eq!(list[1].published_at, "");
        assert!(list[1].prerelease);
    }

    #[test]
    fn rate_limits_get_a_plain_message() {
        // 429 is always a limit; retry-after seconds round up to whole minutes.
        assert_eq!(
            rate_limit_message(429, None, Some("90")).as_deref(),
            Some("GitHub is limiting requests right now. Try again in 2 minutes.")
        );
        assert_eq!(
            rate_limit_message(429, None, Some("30")).as_deref(),
            Some("GitHub is limiting requests right now. Try again in a minute.")
        );
        assert_eq!(
            rate_limit_message(429, None, None).as_deref(),
            Some("GitHub is limiting requests right now. Try again in a few minutes.")
        );
        // 403 is a limit only when no requests remain (or a retry time is given).
        assert!(rate_limit_message(403, Some("0"), None).is_some());
        assert!(rate_limit_message(403, None, Some("60")).is_some());
        assert!(rate_limit_message(403, Some("12"), None).is_none());
        assert!(rate_limit_message(403, None, None).is_none());
        assert!(rate_limit_message(404, Some("0"), None).is_none());
        assert!(rate_limit_message(200, None, None).is_none());
    }

    #[test]
    fn empty_and_invalid_lists() {
        assert!(parse_releases(b"[]").unwrap().is_empty());
        assert!(parse_releases(b"not json").is_err());
        // GitHub answers an error with an object, not a list.
        assert!(parse_releases(br#"{"message":"Not Found"}"#).is_err());
    }
}
