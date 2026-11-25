//! What the plugin publishes: runs as sessions; failed runs, review requests and mentions as notifications.

use crate::{link, runs, threads::{Reason, Thread}};
use serde_json::{json, Value};
use skerry_plugin_sdk::session;

/// A failed run older than this is not worth a notification.
const FAILURE_WINDOW_MS: i64 = 24 * 60 * 60 * 1_000;
const APP_NAME: &str = "GitHub";
const SOURCE_ID: &str = "github";

#[derive(Clone, Copy, Debug)]
pub struct Options {
    pub reviews: bool,
    pub mentions: bool,
    pub failures: bool,
}

fn notification(id: String, title: String, body: String, received_at: i64, path: &str) -> Value {
    json!({"id": id, "sourceId": SOURCE_ID, "appName": APP_NAME, "icon": "github", "title": title, "body": body,
           "receivedAt": received_at, "action": link::open_action(path)})
}

fn run_notification(run: &runs::Run) -> Value {
    let name = if run.workflow.is_empty() { "Workflow" } else { run.workflow.as_str() };
    let title = if run.branch.is_empty() { format!("{name} failed") } else { format!("{name} failed · {}", run.branch) };
    let body = if run.display_title.is_empty() { run.repo.clone() } else { format!("{} — {}", run.repo, run.display_title) };
    notification(format!("fail-{}", run.id), title, body, run.updated_ms, &format!("/{}/actions/runs/{}", run.repo, run.id))
}

fn thread_notification(thread: &Thread) -> Value {
    // The time is part of the id, so a new comment on a dismissed thread shows up again.
    notification(format!("thread-{}-{}", thread.id, thread.updated_ms), format!("{} · {}", thread.reason.label(), thread.repo),
                 thread.title.clone(), thread.updated_ms, &thread.path)
}

/// The value for one `publish` notification.
pub fn publish_data(runs: &[runs::Run], threads: &[Thread], options: Options, now_ms: i64) -> Value {
    let sessions: Vec<Value> = runs.iter().map(|run| {
        let path = format!("/{}/actions/runs/{}", run.repo, run.id);
        session(&format!("run-{}", run.id), &runs::title(run), Some(&run.repo), runs::session_status(run), run.updated_ms, Some(&link::open_action(&path)))
    }).collect();
    let mut notifications: Vec<Value> = Vec::new();
    if options.failures {
        notifications.extend(runs.iter().filter(|run| runs::is_failure(run) && now_ms - run.updated_ms <= FAILURE_WINDOW_MS).map(run_notification));
    }
    notifications.extend(threads.iter().filter(|thread| match thread.reason {
        Reason::ReviewRequested => options.reviews,
        Reason::Mention | Reason::TeamMention => options.mentions,
    }).map(thread_notification));
    notifications.sort_by_key(|item| std::cmp::Reverse(item["receivedAt"].as_i64().unwrap_or(0)));
    json!({"quota": [], "sessions": sessions, "notifications": notifications})
}

#[cfg(test)]
mod tests {
    use super::*;

    const HOUR: i64 = 3_600_000;
    const ALL: Options = Options { reviews: true, mentions: true, failures: true };

    fn run(id: u64, status: &str, conclusion: Option<&str>, updated_ms: i64) -> runs::Run {
        runs::Run { id, repo: "o/r".into(), workflow: "CI".into(), branch: "main".into(), display_title: "Fix it".into(),
                    status: status.into(), conclusion: conclusion.map(str::to_owned), updated_ms }
    }

    fn thread(id: &str, reason: Reason, updated_ms: i64) -> Thread {
        Thread { id: id.into(), reason, repo: "o/r".into(), title: "Add plugin".into(), path: "/o/r/pull/12".into(), updated_ms }
    }

    #[test]
    fn every_run_is_a_session() {
        let data = publish_data(&[run(1, "in_progress", None, 5 * HOUR), run(2, "completed", Some("success"), 4 * HOUR)], &[], ALL, 6 * HOUR);
        let sessions = data["sessions"].as_array().unwrap();
        assert_eq!(sessions.len(), 2);
        assert_eq!((sessions[0]["id"].as_str(), sessions[0]["status"].as_str(), sessions[0]["cwd"].as_str()), (Some("run-1"), Some("running"), Some("o/r")));
        assert_eq!(sessions[1]["status"], "completed");
        assert_eq!(sessions[0]["action"], "open:/o/r/actions/runs/1");
        assert!(data["notifications"].as_array().unwrap().is_empty());
    }

    #[test]
    fn recent_failures_notify_and_old_ones_do_not() {
        let data = publish_data(&[run(1, "completed", Some("failure"), 30 * HOUR), run(2, "completed", Some("failure"), 5 * HOUR)], &[], ALL, 30 * HOUR + HOUR);
        let notifications = data["notifications"].as_array().unwrap();
        assert_eq!(notifications.len(), 1);
        assert_eq!(notifications[0]["id"], "fail-1");
        assert_eq!(notifications[0]["title"], "CI failed · main");
        assert_eq!(notifications[0]["body"], "o/r — Fix it");
        assert_eq!(notifications[0]["receivedAt"], 30 * HOUR);
    }

    #[test]
    fn threads_follow_the_options() {
        let threads = [thread("1", Reason::ReviewRequested, 3), thread("2", Reason::Mention, 2), thread("3", Reason::TeamMention, 1)];
        let ids = |options| publish_data(&[], &threads, options, 10)["notifications"].as_array().unwrap().iter().map(|n| n["id"].as_str().unwrap().to_owned()).collect::<Vec<_>>();
        assert_eq!(ids(ALL), ["thread-1-3", "thread-2-2", "thread-3-1"]);
        assert_eq!(ids(Options { reviews: false, ..ALL }), ["thread-2-2", "thread-3-1"]);
        assert_eq!(ids(Options { mentions: false, ..ALL }), ["thread-1-3"]);
        assert!(ids(Options { reviews: false, mentions: false, failures: false }).is_empty());
    }

    #[test]
    fn failures_can_be_switched_off_and_notifications_are_newest_first() {
        let runs = [run(1, "completed", Some("failure"), 5 * HOUR)];
        let off = publish_data(&runs, &[], Options { failures: false, ..ALL }, 6 * HOUR);
        assert!(off["notifications"].as_array().unwrap().is_empty());
        let both = publish_data(&runs, &[thread("1", Reason::Mention, 5 * HOUR + 1)], ALL, 6 * HOUR);
        assert_eq!(both["notifications"][0]["id"], format!("thread-1-{}", 5 * HOUR + 1));
        assert_eq!(both["notifications"][1]["id"], "fail-1");
        assert_eq!(both["notifications"][0]["action"], "open:/o/r/pull/12");
    }

    #[test]
    fn what_is_published_passes_the_hosts_checks() {
        let data = publish_data(&[run(1, "completed", Some("failure"), 5 * HOUR)], &[thread("1", Reason::Mention, 5 * HOUR)], ALL, 6 * HOUR);
        for item in data["notifications"].as_array().unwrap() {
            assert_eq!(item.as_object().unwrap().len(), 8);
            assert!(link::resolve_open(item["action"].as_str().unwrap()).is_some());
        }
        for item in data["sessions"].as_array().unwrap() {
            assert!(link::resolve_open(item["action"].as_str().unwrap()).is_some());
        }
    }
}
