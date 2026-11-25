//! GitHub answers with RFC 3339 UTC times such as `2026-11-25T10:42:00Z`.

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let month_from_march = (month + 9) % 12;
    let day_of_year = (153 * month_from_march + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        _ => 28,
    }
}

fn number(text: &str, range: std::ops::Range<usize>) -> Option<i64> {
    let part = text.get(range)?;
    if part.is_empty() || !part.bytes().all(|byte| byte.is_ascii_digit()) { return None; }
    part.parse().ok()
}

/// Milliseconds since the Unix epoch, or `None` for anything that is not a UTC time of that shape.
pub fn parse_rfc3339_ms(text: &str) -> Option<i64> {
    let text = text.trim();
    let bytes = text.as_bytes();
    if bytes.len() < 20 || bytes[4] != b'-' || bytes[7] != b'-' || bytes[10] != b'T' || bytes[13] != b':' || bytes[16] != b':' {
        return None;
    }
    // Only UTC ("Z") is accepted, optionally with fractional seconds before it.
    if !text.ends_with('Z') || (bytes.len() > 20 && bytes[19] != b'.') { return None; }
    let (year, month, day) = (number(text, 0..4)?, number(text, 5..7)?, number(text, 8..10)?);
    let (hour, minute, second) = (number(text, 11..13)?, number(text, 14..16)?, number(text, 17..19)?);
    if !(1..=12).contains(&month) || day < 1 || day > days_in_month(year, month) || hour > 23 || minute > 59 || second > 60 {
        return None;
    }
    let seconds = days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second.min(59);
    Some(seconds * 1_000)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_times() {
        assert_eq!(parse_rfc3339_ms("1970-01-01T00:00:00Z"), Some(0));
        assert_eq!(parse_rfc3339_ms("2000-01-01T00:00:00Z"), Some(946_684_800_000));
        assert_eq!(parse_rfc3339_ms("2026-11-25T10:42:00Z"), Some(1_795_603_320_000));
        assert_eq!(parse_rfc3339_ms("2024-02-29T23:59:59Z"), Some(1_709_251_199_000));
    }

    #[test]
    fn fractional_seconds_are_dropped() {
        assert_eq!(parse_rfc3339_ms("2000-01-01T00:00:00.789Z"), Some(946_684_800_000));
    }

    #[test]
    fn rejects_other_shapes() {
        for bad in ["", "yesterday", "2026-11-25", "2026-11-25T10:42:00", "2026-11-25T10:42:00+02:00", "2026-13-01T00:00:00Z",
                    "2026-02-30T00:00:00Z", "2025-02-29T00:00:00Z", "2026-11-25T24:00:00Z", "2026-11-25T10:42:0xZ"] {
            assert_eq!(parse_rfc3339_ms(bad), None, "{bad}");
        }
    }
}
