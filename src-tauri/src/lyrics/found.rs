//! Lyrics as an online source gives them: timed lines, with a translation per line when the
//! source has one, turned into the LRC text the island shows.

/// Synced lyrics in LRC, and the translation of the same lines in LRC when there is one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct FoundLyrics {
    pub(super) lrc: String,
    pub(super) translation: Option<String>,
    pub(super) duration_ms: Option<i64>,
}
