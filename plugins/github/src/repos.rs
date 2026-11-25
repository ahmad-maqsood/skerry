//! The list of repositories the user wants to watch, as typed into the settings box.

/// Each repository costs one request per refresh, so the list is bounded.
pub const MAX_REPOS: usize = 15;

fn valid_owner(owner: &str) -> bool {
    !owner.is_empty() && owner.len() <= 39 && owner.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
}

fn valid_name(name: &str) -> bool {
    !name.is_empty() && name.len() <= 100 && name != "." && name != ".."
        && name.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

/// True for `owner/name` made only of characters GitHub allows, so it is safe in a URL path.
pub fn valid_repo(repo: &str) -> bool {
    repo.split_once('/').is_some_and(|(owner, name)| valid_owner(owner) && valid_name(name))
}

fn clean(entry: &str) -> Option<String> {
    let entry = entry.trim().trim_end_matches('/');
    let entry = entry
        .strip_prefix("https://github.com/")
        .or_else(|| entry.strip_prefix("http://github.com/"))
        .or_else(|| entry.strip_prefix("github.com/"))
        .unwrap_or(entry);
    // A pasted page address such as owner/repo/actions keeps only its first two parts.
    let mut parts = entry.split('/');
    let (owner, name) = (parts.next()?, parts.next()?);
    let name = name.strip_suffix(".git").unwrap_or(name);
    let repo = format!("{owner}/{name}");
    valid_repo(&repo).then_some(repo)
}

/// Splits on commas, spaces and line breaks, drops what is not a repository and repeats (ignoring
/// case), and keeps at most [`MAX_REPOS`].
pub fn parse_repos(text: &str) -> Vec<String> {
    let mut repos: Vec<String> = Vec::new();
    for entry in text.split(|c: char| c == ',' || c == ';' || c.is_whitespace()) {
        let Some(repo) = clean(entry) else { continue };
        if !repos.iter().any(|known| known.eq_ignore_ascii_case(&repo)) { repos.push(repo); }
        if repos.len() == MAX_REPOS { break; }
    }
    repos
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_on_commas_spaces_and_lines() {
        assert_eq!(parse_repos("a/one, b/two\nc/three  d/four;e/five"), ["a/one", "b/two", "c/three", "d/four", "e/five"]);
    }

    #[test]
    fn accepts_pasted_addresses() {
        assert_eq!(parse_repos("https://github.com/ahmad-maqsood/skerry-island/actions"), ["ahmad-maqsood/skerry-island"]);
        assert_eq!(parse_repos("github.com/a/b.git"), ["a/b"]);
    }

    #[test]
    fn drops_junk_and_repeats() {
        assert_eq!(parse_repos("nonsense, a/b, A/B, ../x, a/../b, a/b c, /x, x/"), ["a/b"]);
        assert!(parse_repos("").is_empty());
    }

    #[test]
    fn keeps_at_most_the_limit() {
        let text: String = (0..40).map(|i| format!("o/r{i} ")).collect();
        assert_eq!(parse_repos(&text).len(), MAX_REPOS);
    }

    #[test]
    fn checks_characters() {
        assert!(valid_repo("a-b/c_d.e"));
        for bad in ["a", "a/", "/b", "a/b/c", "a b/c", "a/b?x=1", "a/b#c", "-/..", "a%2f/b"] {
            assert!(!valid_repo(bad), "{bad}");
        }
    }
}
