//! GitHub plugin: workflow runs as sessions; failed runs, review requests and mentions as
//! notifications. Talks only to api.github.com, with the user's own token.

mod feed;
mod limits;
mod link;
mod repos;
mod runs;
mod threads;
mod time;

use serde_json::{json, Value};
use skerry_plugin_sdk::{empty, now, run};
use std::{collections::HashMap, time::{Duration, Instant}};

const API: &str = "https://api.github.com";
const API_PREFIX: &str = "https://api.github.com/";
const USER_AGENT: &str = "skerry-github-plugin";
/// The newest runs kept per repository.
const RUNS_PER_REPO: u32 = 5;
/// After this long in one refresh, the remaining repositories are served from what was fetched before.
const REFRESH_BUDGET: Duration = Duration::from_secs(40);
/// How long to stay quiet after GitHub turns the token down.
const REJECTED_PAUSE: Duration = Duration::from_secs(300);

enum Outcome {
    Fresh(Value, Option<String>),
    NotModified,
    /// The token is out of requests; wait this many seconds.
    Limited(u64),
    Rejected,
    Failed,
}

fn unix_seconds() -> u64 {
    u64::try_from(now() / 1_000).unwrap_or(0)
}

fn fetch(agent: &ureq::Agent, token: &str, path: &str, etag: Option<&str>) -> Outcome {
    let mut url = format!("{API}{path}");
    // One hop at most, and only within api.github.com (a renamed repository answers with a redirect).
    for _ in 0..2 {
        let mut request = agent.get(&url)
            .set("Authorization", &format!("Bearer {token}"))
            .set("Accept", "application/vnd.github+json")
            .set("X-GitHub-Api-Version", "2022-11-28")
            .set("User-Agent", USER_AGENT);
        if let Some(tag) = etag { request = request.set("If-None-Match", tag); }
        let response = match request.call() {
            Ok(response) => response,
            Err(ureq::Error::Status(304, _)) => return Outcome::NotModified,
            Err(ureq::Error::Status(401, _)) => return Outcome::Rejected,
            Err(ureq::Error::Status(code, response)) => {
                return match limits::wait_seconds(code, response.header("x-ratelimit-remaining"), response.header("retry-after"),
                                                  response.header("x-ratelimit-reset"), unix_seconds()) {
                    Some(seconds) => Outcome::Limited(seconds),
                    None => Outcome::Failed,
                };
            }
            Err(_) => return Outcome::Failed,
        };
        if (300..400).contains(&response.status()) {
            match response.header("location").filter(|location| location.starts_with(API_PREFIX)) {
                Some(location) => { url = location.to_owned(); continue; }
                None => return Outcome::Failed,
            }
        }
        let etag = response.header("etag").map(str::to_owned);
        return match response.into_json::<Value>() { Ok(body) => Outcome::Fresh(body, etag), Err(_) => Outcome::Failed };
    }
    Outcome::Failed
}

enum Halt {
    Limited(u64),
    Rejected,
}

struct State {
    agent: ureq::Agent,
    /// The last good answer for each request path, with its ETag, so an unchanged answer costs nothing.
    cache: HashMap<String, (Option<String>, Value)>,
    /// What was last published, kept when GitHub cannot be reached so the island does not go blank.
    last: Value,
    paused_until: Option<Instant>,
}

impl State {
    fn new() -> Self {
        let agent = ureq::AgentBuilder::new()
            .timeout_connect(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .redirects(0)
            .build();
        Self { agent, cache: HashMap::new(), last: empty(), paused_until: None }
    }

    /// The answer for `path`: fresh, or the cached one when unchanged, unreachable or over budget.
    fn load(&mut self, token: &str, path: &str, use_network: bool) -> Result<Option<Value>, Halt> {
        let cached = self.cache.get(path).cloned();
        if !use_network { return Ok(cached.map(|(_, body)| body)); }
        let etag = cached.as_ref().and_then(|(etag, _)| etag.clone());
        match fetch(&self.agent, token, path, etag.as_deref()) {
            Outcome::Fresh(body, etag) => { self.cache.insert(path.to_owned(), (etag, body.clone())); Ok(Some(body)) }
            Outcome::NotModified | Outcome::Failed => Ok(cached.map(|(_, body)| body)),
            Outcome::Limited(seconds) => Err(Halt::Limited(seconds)),
            Outcome::Rejected => Err(Halt::Rejected),
        }
    }

    fn halt(&mut self, halt: Halt) -> Value {
        match halt {
            Halt::Limited(seconds) => {
                eprintln!("GitHub is limiting requests; waiting {seconds} seconds");
                self.paused_until = Some(Instant::now() + Duration::from_secs(seconds));
                self.last.clone()
            }
            Halt::Rejected => {
                eprintln!("GitHub rejected the token; check it in the plugin settings");
                self.paused_until = Some(Instant::now() + REJECTED_PAUSE);
                self.last = empty();
                self.last.clone()
            }
        }
    }

    fn refresh(&mut self, settings: &Value) -> Value {
        let token = settings["token"].as_str().map(str::trim).unwrap_or_default().to_owned();
        if token.is_empty() { self.last = empty(); return self.last.clone(); }
        if self.paused_until.is_some_and(|until| Instant::now() < until) { return self.last.clone(); }
        self.paused_until = None;
        let flag = |key: &str| settings[key].as_bool().unwrap_or(true);
        let options = feed::Options { reviews: flag("notify_reviews"), mentions: flag("notify_mentions"), failures: flag("notify_failures") };
        let started = Instant::now();

        let mut all_runs = Vec::new();
        for repo in repos::parse_repos(settings["repos"].as_str().unwrap_or_default()) {
            let path = format!("/repos/{repo}/actions/runs?per_page={RUNS_PER_REPO}");
            match self.load(&token, &path, started.elapsed() < REFRESH_BUDGET) {
                Ok(Some(body)) => all_runs.extend(runs::parse_runs(&repo, &body)),
                Ok(None) => {}
                Err(halt) => return self.halt(halt),
            }
        }
        let mut all_threads = Vec::new();
        if options.reviews || options.mentions {
            match self.load(&token, "/notifications?participating=true&per_page=50", started.elapsed() < REFRESH_BUDGET) {
                Ok(Some(body)) => all_threads = threads::parse_threads(&body),
                Ok(None) => {}
                Err(halt) => return self.halt(halt),
            }
        }
        self.last = feed::publish_data(&all_runs, &all_threads, options, now());
        self.last.clone()
    }
}

fn main() {
    let mut state = State::new();
    let result = run(
        Duration::from_secs(120),
        |settings| Ok(state.refresh(settings)),
        |action, _| match action {
            "refresh" => Ok(Value::Null),
            other => match link::resolve_open(other) {
                Some(url) => Ok(json!({ "openUrl": url })),
                None => Err("Unknown action".into()),
            },
        },
    );
    if result.is_err() { std::process::exit(1); }
}
