//! Notification threads from `GET /notifications?participating=true`: only the ones about the
//! user, and only the reasons the plugin reports.

use crate::{link::subject_path, repos::valid_repo, time::parse_rfc3339_ms};
use serde_json::Value;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Reason {
    ReviewRequested,
    Mention,
    TeamMention,
}

impl Reason {
    fn from_api(reason: &str) -> Option<Self> {
        match reason {
            "review_requested" => Some(Self::ReviewRequested),
            "mention" => Some(Self::Mention),
            "team_mention" => Some(Self::TeamMention),
            _ => None,
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::ReviewRequested => "Review requested",
            Self::Mention => "Mentioned",
            Self::TeamMention => "Team mentioned",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Thread {
    pub id: String,
    pub reason: Reason,
    pub repo: String,
    pub title: String,
    /// The github.com page path for what the thread is about.
    pub path: String,
    pub updated_ms: i64,
}

fn parse_thread(value: &Value) -> Option<Thread> {
    let id = value["id"].as_str().filter(|id| !id.is_empty() && id.bytes().all(|byte| byte.is_ascii_alphanumeric()))?;
    let reason = Reason::from_api(value["reason"].as_str()?)?;
    if value["unread"].as_bool() == Some(false) { return None; }
    let repo = value["repository"]["full_name"].as_str().filter(|repo| valid_repo(repo))?;
    Some(Thread {
        id: id.to_owned(),
        reason,
        repo: repo.to_owned(),
        title: value["subject"]["title"].as_str().unwrap_or_default().trim().to_owned(),
        path: subject_path(value["subject"]["url"].as_str().unwrap_or_default(), repo),
        updated_ms: parse_rfc3339_ms(value["updated_at"].as_str()?)?,
    })
}

pub fn parse_threads(body: &Value) -> Vec<Thread> {
    body.as_array().map(|threads| threads.iter().filter_map(parse_thread).collect()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn thread(reason: &str) -> Value {
        json!({"id": "123", "reason": reason, "unread": true, "updated_at": "2026-11-25T10:42:00Z",
               "subject": {"title": "Add plugin", "url": "https://api.github.com/repos/o/r/pulls/12", "type": "PullRequest"},
               "repository": {"full_name": "o/r"}})
    }

    #[test]
    fn keeps_review_requests_and_mentions() {
        let parsed = parse_threads(&json!([thread("review_requested"), thread("mention"), thread("team_mention")]));
        assert_eq!(parsed.iter().map(|t| t.reason).collect::<Vec<_>>(), [Reason::ReviewRequested, Reason::Mention, Reason::TeamMention]);
        assert_eq!((parsed[0].path.as_str(), parsed[0].title.as_str(), parsed[0].updated_ms), ("/o/r/pull/12", "Add plugin", 1_795_603_320_000));
    }

    #[test]
    fn drops_other_reasons_read_threads_and_bad_data() {
        let mut read = thread("mention");
        read["unread"] = json!(false);
        let mut bad_repo = thread("mention");
        bad_repo["repository"]["full_name"] = json!("../x");
        let mut bad_id = thread("mention");
        bad_id["id"] = json!("1/2");
        let parsed = parse_threads(&json!([thread("author"), thread("comment"), thread("subscribed"), read, bad_repo, bad_id, {"id": "9"}]));
        assert!(parsed.is_empty());
        assert!(parse_threads(&json!({"message": "Bad credentials"})).is_empty());
    }

    #[test]
    fn labels() {
        assert_eq!(Reason::ReviewRequested.label(), "Review requested");
        assert_eq!(Reason::Mention.label(), "Mentioned");
        assert_eq!(Reason::TeamMention.label(), "Team mentioned");
    }
}
