//! Release notes for Settings → Changelog: the descriptions of Skerry's published GitHub releases.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::system::updater::get_updater_proxy;

const RELEASES_URL: &str = "https://api.github.com/repos/ahmad-maqsood/skerry/releases";
const RELEASES_PER_PAGE: &str = "30";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);
/// The most a response may hold; thirty descriptions are far smaller.
const MAX_RESPONSE_BYTES: usize = 2 * 1024 * 1024;
const USER_AGENT: &str = concat!("Skerry/", env!("CARGO_PKG_VERSION"), " (https://github.com/ahmad-maqsood/skerry)");

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

fn client() -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder().user_agent(USER_AGENT).timeout(REQUEST_TIMEOUT);
    if let Some(proxy_url) = get_updater_proxy() {
        if let Ok(proxy) = reqwest::Proxy::all(&proxy_url) {
            builder = builder.proxy(proxy);
        }
    }
    builder.build().map_err(|error| format!("Could not create the request: {error}"))
}

async fn download() -> Result<Vec<u8>, String> {
    // reqwest is built without its query feature, so the parameter goes into the URL by hand.
    let url = reqwest::Url::parse_with_params(RELEASES_URL, [("per_page", RELEASES_PER_PAGE)])
        .map_err(|error| error.to_string())?;
    let mut response = client()?
        .get(url)
        .header(reqwest::header::ACCEPT, "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Could not reach GitHub: {error}"))?
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
    parse_releases(&download().await?)
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
<<<<<<< Updated upstream
            br#"[
=======
            br###"[
>>>>>>> Stashed changes
              {"tag_name":"v1.2.0","name":"Skerry 1.2","body":"## What's new\r\n\r\n- A\r\n","published_at":"2026-11-20T10:00:00Z","html_url":"https://github.com/x/y/releases/tag/v1.2.0","draft":false,"prerelease":false},
              {"tag_name":"v1.3.0","name":"Soon","body":"x","draft":true},
              {"tag_name":"v1.1.0-beta.1","name":null,"body":null,"published_at":null,"html_url":"u","prerelease":true},
              {"tag_name":"  ","name":"No tag"}
<<<<<<< Updated upstream
            ]"#,
=======
            ]"###,
>>>>>>> Stashed changes
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
    fn empty_and_invalid_lists() {
        assert!(parse_releases(b"[]").unwrap().is_empty());
        assert!(parse_releases(b"not json").is_err());
        // GitHub answers an error with an object, not a list.
        assert!(parse_releases(br#"{"message":"Not Found"}"#).is_err());
    }
}
