// The release history Settings → Changelog reads: changelog.json, attached to every release and
// downloaded from releases/latest/download. That is a plain file download, so it does not use up
// the 60 requests an hour GitHub's API allows each unsigned-in IP address (often shared).
// Entries have the API's field names, so the app reads either source the same way
// (Rust: changelog/mod.rs parse_releases).

/** As many releases as the app asks the API for. */
export const CHANGELOG_LIMIT = 30;

const pick = ({ tag_name, name, body, published_at, html_url, prerelease }) =>
  ({ tag_name, name, body, published_at, html_url, draft: false, prerelease });

/**
 * The release being published, then the ones already published, newest first as the API lists
 * them. `published` is the API's release list; drafts and an earlier entry for the same tag go.
 */
export function changelogEntries(current, published) {
  const earlier = published.filter((release) => !release.draft && release.tag_name !== current.tag_name);
  return [current, ...earlier].slice(0, CHANGELOG_LIMIT).map(pick);
}
