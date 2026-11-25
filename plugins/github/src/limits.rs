//! Reading GitHub's rate-limit answers. A limited request is not retried until it is allowed again.

const DEFAULT_WAIT_SECS: u64 = 60;
const MAX_WAIT_SECS: u64 = 3_600;

fn number(value: Option<&str>) -> Option<u64> {
    value.and_then(|text| text.trim().parse().ok())
}

/// How many seconds to wait, when the answer says the token is out of requests. `None` for any
/// other failure (a 403 that is only "forbidden", a server error). `now_secs` is the current time
/// in Unix seconds, for the `x-ratelimit-reset` header.
pub fn wait_seconds(status: u16, remaining: Option<&str>, retry_after: Option<&str>, reset: Option<&str>, now_secs: u64) -> Option<u64> {
    let wait = match status {
        429 => number(retry_after).unwrap_or(DEFAULT_WAIT_SECS),
        403 => {
            if let Some(seconds) = number(retry_after) { seconds }
            else if number(remaining) == Some(0) {
                number(reset).map_or(DEFAULT_WAIT_SECS, |at| at.saturating_sub(now_secs).max(1))
            } else { return None; }
        }
        _ => return None,
    };
    Some(wait.clamp(1, MAX_WAIT_SECS))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn too_many_requests_uses_retry_after() {
        assert_eq!(wait_seconds(429, None, Some("30"), None, 0), Some(30));
        assert_eq!(wait_seconds(429, None, None, None, 0), Some(60));
    }

    #[test]
    fn forbidden_with_no_requests_left_waits_for_the_reset() {
        assert_eq!(wait_seconds(403, Some("0"), None, Some("1000"), 940), Some(60));
        assert_eq!(wait_seconds(403, Some("0"), None, Some("900"), 940), Some(1));
        assert_eq!(wait_seconds(403, Some("0"), None, None, 0), Some(60));
        assert_eq!(wait_seconds(403, None, Some("120"), None, 0), Some(120));
    }

    #[test]
    fn plain_forbidden_and_other_errors_are_not_rate_limits() {
        assert_eq!(wait_seconds(403, Some("4999"), None, Some("1000"), 0), None);
        assert_eq!(wait_seconds(403, None, None, None, 0), None);
        assert_eq!(wait_seconds(404, Some("0"), None, None, 0), None);
        assert_eq!(wait_seconds(500, None, Some("5"), None, 0), None);
    }

    #[test]
    fn waits_are_bounded() {
        assert_eq!(wait_seconds(429, None, Some("999999"), None, 0), Some(3_600));
        assert_eq!(wait_seconds(429, None, Some("0"), None, 0), Some(1));
    }
}
