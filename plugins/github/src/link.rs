//! Links. A published item carries an action id such as `open:/owner/repo/pull/12`. When the user
//! clicks it, the plugin answers with the full address and the island opens it in the browser.

use crate::repos::valid_repo;

const OPEN_PREFIX: &str = "open:";
const API_REPOS: &str = "https://api.github.com/repos/";

/// The action id for a page on github.com, given its path.
pub fn open_action(path: &str) -> String {
    format!("{OPEN_PREFIX}{path}")
}

fn safe_segment(segment: &str) -> bool {
    !segment.is_empty() && segment != "." && segment != ".."
        && segment.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

/// The github.com address for an `open:` action, or `None` when the path is not a plain
/// repository page path. Nothing but github.com is ever returned.
pub fn resolve_open(action: &str) -> Option<String> {
    let path = action.strip_prefix(OPEN_PREFIX)?;
    let segments: Vec<&str> = path.strip_prefix('/')?.split('/').collect();
    if path.len() > 200 || segments.len() < 2 || segments.len() > 6 || !segments.iter().all(|segment| safe_segment(segment)) {
        return None;
    }
    Some(format!("https://github.com{path}"))
}

/// The page for what a notification is about. `subject_url` is an API address such as
/// `https://api.github.com/repos/o/r/pulls/12`; anything unexpected falls back to the repository.
pub fn subject_path(subject_url: &str, repo: &str) -> String {
    let fallback = format!("/{repo}");
    let Some(rest) = subject_url.strip_prefix(API_REPOS) else { return fallback };
    let parts: Vec<&str> = rest.split('/').collect();
    let [owner, name, kind, id] = parts.as_slice() else { return fallback };
    let page = match *kind {
        "pulls" => "pull",
        "issues" => "issues",
        "commits" => "commit",
        _ => return fallback,
    };
    if !valid_repo(&format!("{owner}/{name}")) || !safe_segment(id) { return fallback; }
    format!("/{owner}/{name}/{page}/{id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_actions_resolve_to_github() {
        let action = open_action("/o/r/pull/12");
        assert_eq!(resolve_open(&action).as_deref(), Some("https://github.com/o/r/pull/12"));
        assert_eq!(resolve_open("open:/o/r/actions/runs/99").as_deref(), Some("https://github.com/o/r/actions/runs/99"));
    }

    #[test]
    fn other_actions_do_not_resolve() {
        for bad in ["refresh", "open:", "open:o/r", "open:/o", "open://evil.com/x", "open:/o/../r", "open:/o/r?x=1", "open:/o/r#x",
                    "open:/o/r/a/b/c/d/e", "open:https://evil.com/a/b", "open:/o/r/%2e%2e", "open:/o/r/a b"] {
            assert_eq!(resolve_open(bad), None, "{bad}");
        }
        assert_eq!(resolve_open(&format!("open:/o/{}", "a".repeat(300))), None);
    }

    #[test]
    fn subjects_map_to_pages() {
        assert_eq!(subject_path("https://api.github.com/repos/o/r/pulls/12", "o/r"), "/o/r/pull/12");
        assert_eq!(subject_path("https://api.github.com/repos/o/r/issues/7", "o/r"), "/o/r/issues/7");
        assert_eq!(subject_path("https://api.github.com/repos/o/r/commits/abc123", "o/r"), "/o/r/commit/abc123");
    }

    #[test]
    fn unexpected_subjects_fall_back_to_the_repository() {
        for url in ["", "https://evil.com/repos/o/r/pulls/1", "https://api.github.com/repos/o/r/releases/5",
                    "https://api.github.com/repos/o/r/pulls/../x", "https://api.github.com/repos/o/r/pulls/1/extra"] {
            assert_eq!(subject_path(url, "o/r"), "/o/r", "{url}");
        }
    }
}
