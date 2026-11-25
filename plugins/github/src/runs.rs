//! Workflow runs from `GET /repos/{owner}/{repo}/actions/runs`.

use crate::time::parse_rfc3339_ms;
use serde_json::Value;

#[derive(Clone, Debug, PartialEq)]
pub struct Run {
    pub id: u64,
    pub repo: String,
    pub workflow: String,
    pub branch: String,
    pub display_title: String,
    pub status: String,
    pub conclusion: Option<String>,
    pub updated_ms: i64,
}

fn text(value: &Value, key: &str) -> String {
    value[key].as_str().unwrap_or_default().trim().to_owned()
}

/// One run object. `None` when it has no id or time, so a changed answer cannot publish nonsense.
pub fn parse_run(repo: &str, value: &Value) -> Option<Run> {
    Some(Run {
        id: value["id"].as_u64()?,
        repo: repo.to_owned(),
        workflow: text(value, "name"),
        branch: text(value, "head_branch"),
        display_title: text(value, "display_title"),
        status: text(value, "status"),
        conclusion: value["conclusion"].as_str().map(str::to_owned),
        updated_ms: parse_rfc3339_ms(value["updated_at"].as_str()?)?,
    })
}

/// Every run in an answer, in the order GitHub sent them (newest first).
pub fn parse_runs(repo: &str, body: &Value) -> Vec<Run> {
    body["workflow_runs"].as_array().map(|runs| runs.iter().filter_map(|run| parse_run(repo, run)).collect()).unwrap_or_default()
}

/// The island's three session states: `running`, `waiting` or `completed`.
pub fn session_status(run: &Run) -> &'static str {
    if run.status == "completed" {
        // A run held for approval is finished as far as GitHub is concerned, but it is waiting for the user.
        return if run.conclusion.as_deref() == Some("action_required") { "waiting" } else { "completed" };
    }
    if run.status == "waiting" { "waiting" } else { "running" }
}

pub fn is_failure(run: &Run) -> bool {
    run.status == "completed" && matches!(run.conclusion.as_deref(), Some("failure" | "timed_out" | "startup_failure"))
}

fn outcome(run: &Run) -> Option<&'static str> {
    match (run.status.as_str(), run.conclusion.as_deref()) {
        ("completed", Some("failure" | "startup_failure")) => Some("failed"),
        ("completed", Some("timed_out")) => Some("timed out"),
        ("completed", Some("cancelled")) => Some("cancelled"),
        ("completed", Some("skipped")) => Some("skipped"),
        ("completed", Some("action_required")) | ("waiting", _) => Some("waiting for approval"),
        _ => None,
    }
}

/// `CI · main`, with ` — failed` and the like after it when the run did not simply succeed.
pub fn title(run: &Run) -> String {
    let name = if run.workflow.is_empty() { "Workflow" } else { run.workflow.as_str() };
    let mut title = if run.branch.is_empty() { name.to_owned() } else { format!("{name} · {}", run.branch) };
    if let Some(outcome) = outcome(run) { title.push_str(" — "); title.push_str(outcome); }
    title
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn run(status: &str, conclusion: Option<&str>) -> Run {
        Run { id: 1, repo: "o/r".into(), workflow: "CI".into(), branch: "main".into(), display_title: "Fix it".into(),
              status: status.into(), conclusion: conclusion.map(str::to_owned), updated_ms: 0 }
    }

    #[test]
    fn parses_a_run() {
        let value = json!({"id": 42, "name": "CI", "head_branch": "main", "display_title": "Fix it", "status": "completed",
                           "conclusion": "failure", "updated_at": "2026-11-25T10:42:00Z"});
        let parsed = parse_run("o/r", &value).unwrap();
        assert_eq!((parsed.id, parsed.updated_ms, parsed.workflow.as_str()), (42, 1_795_603_320_000, "CI"));
        assert_eq!(parsed.conclusion.as_deref(), Some("failure"));
    }

    #[test]
    fn skips_runs_without_an_id_or_time() {
        assert!(parse_run("o/r", &json!({"name": "CI", "updated_at": "2026-11-25T10:42:00Z"})).is_none());
        assert!(parse_run("o/r", &json!({"id": 1, "updated_at": "soon"})).is_none());
        assert!(parse_runs("o/r", &json!({"message": "Not Found"})).is_empty());
        assert_eq!(parse_runs("o/r", &json!({"workflow_runs": [{"id": 1, "updated_at": "2026-11-25T10:42:00Z"}, {"x": 1}]})).len(), 1);
    }

    #[test]
    fn maps_states() {
        for (status, conclusion, expected) in [
            ("queued", None, "running"), ("in_progress", None, "running"), ("requested", None, "running"), ("pending", None, "running"),
            ("waiting", None, "waiting"), ("completed", Some("action_required"), "waiting"),
            ("completed", Some("success"), "completed"), ("completed", Some("failure"), "completed"), ("completed", Some("cancelled"), "completed"),
        ] {
            assert_eq!(session_status(&run(status, conclusion)), expected, "{status} {conclusion:?}");
        }
    }

    #[test]
    fn only_real_failures_count() {
        assert!(is_failure(&run("completed", Some("failure"))));
        assert!(is_failure(&run("completed", Some("timed_out"))));
        for conclusion in ["success", "cancelled", "skipped", "neutral", "action_required"] {
            assert!(!is_failure(&run("completed", Some(conclusion))), "{conclusion}");
        }
        assert!(!is_failure(&run("in_progress", None)));
    }

    #[test]
    fn titles_say_what_happened() {
        assert_eq!(title(&run("in_progress", None)), "CI · main");
        assert_eq!(title(&run("completed", Some("success"))), "CI · main");
        assert_eq!(title(&run("completed", Some("failure"))), "CI · main — failed");
        assert_eq!(title(&run("completed", Some("timed_out"))), "CI · main — timed out");
        assert_eq!(title(&run("completed", Some("action_required"))), "CI · main — waiting for approval");
        let mut bare = run("queued", None);
        bare.workflow.clear();
        bare.branch.clear();
        assert_eq!(title(&bare), "Workflow");
    }
}
