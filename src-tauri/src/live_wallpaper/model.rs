//! The live wallpaper's saved settings, status and the rules that need no desktop.

use std::time::Duration;

use serde::{Deserialize, Serialize};

/// How a video whose shape differs from the screen's is shown.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Fit {
    /// Covers the screen, cropping the edges that do not fit.
    #[default]
    Fill,
    /// Shows the whole picture, with black bars.
    Fit,
}

/// How long every desktop must stay hidden before the players are closed to free their memory.
/// Mirrored by LiveWallpaperUnloadAfter in src/features/live-wallpaper/api.ts.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UnloadAfter {
    Minute,
    #[default]
    ThreeMinutes,
    TenMinutes,
    /// The players stay open (and keep their memory) however long the desktop is hidden.
    Never,
}

impl UnloadAfter {
    /// The hidden time after which the players close; `None` for never.
    pub(crate) fn delay(self) -> Option<Duration> {
        match self {
            Self::Minute => Some(Duration::from_secs(60)),
            Self::ThreeMinutes => Some(Duration::from_secs(180)),
            Self::TenMinutes => Some(Duration::from_secs(600)),
            Self::Never => None,
        }
    }
}

/// Mirrored by LiveWallpaperSettings in src/features/live-wallpaper/api.ts. Off by default.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub enabled: bool,
    pub path: String,
    pub fit: Fit,
    /// Pause on battery power or in Battery Saver. On by default, also for files saved before it existed.
    pub pause_on_battery: bool,
    /// When the players close after the desktop was hidden. Three minutes, also for files saved before it existed.
    pub unload_after: UnloadAfter,
}

impl Default for Settings {
    fn default() -> Self {
        Self { enabled: false, path: String::new(), fit: Fit::default(), pause_on_battery: true, unload_after: UnloadAfter::default() }
    }
}

impl Settings {
    /// Whether anything should run at all.
    pub(crate) fn wants_player(&self) -> bool {
        self.enabled && !self.path.is_empty()
    }
}

/// Mirrored by LiveWallpaperStatus in src/features/live-wallpaper/api.ts.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "camelCase")]
pub enum Status {
    #[default]
    Off,
    NoVideo,
    Starting,
    Playing,
    /// The desktop is hidden on every screen.
    Paused,
    /// Paused to save power: on battery or in Battery Saver.
    PausedPower,
    Error(String),
}

/// Whether the power source alone should stop the video.
pub(crate) fn paused_for_power(pause_on_battery: bool, on_battery: bool, battery_saver: bool) -> bool {
    pause_on_battery && (on_battery || battery_saver)
}

/// The part of the picture to show, as left, top, right, bottom fractions of it.
pub(crate) fn source_rect(fit: Fit, video: (u32, u32), screen: (i32, i32)) -> [f32; 4] {
    const WHOLE: [f32; 4] = [0.0, 0.0, 1.0, 1.0];
    if fit == Fit::Fit || video.0 == 0 || video.1 == 0 || screen.0 <= 0 || screen.1 <= 0 {
        return WHOLE;
    }
    let video_shape = video.0 as f32 / video.1 as f32;
    let screen_shape = screen.0 as f32 / screen.1 as f32;
    if video_shape > screen_shape {
        let edge = (1.0 - screen_shape / video_shape) / 2.0;
        [edge, 0.0, 1.0 - edge, 1.0]
    } else {
        let edge = (1.0 - video_shape / screen_shape) / 2.0;
        [0.0, edge, 1.0, 1.0 - edge]
    }
}

/// What to tell the user for an `MF_MEDIA_ENGINE_ERR` code.
pub(crate) fn playback_error(code: u32) -> String {
    match code {
        3 => "The video could not be decoded. The file may be damaged, or your graphics driver cannot play it.",
        4 => "Windows cannot play this video's format. HEVC (common in iPhone .MOV files), AV1 and VP9 may need \
              Microsoft's video extensions from the Microsoft Store. ProRes is not supported: use an H.264 or HEVC copy.",
        _ => "The video stopped playing, even after trying again. Check that the file is still there, then switch \
              live wallpaper off and on.",
    }
    .to_string()
}

/// How many times in a row playback is restarted from where it stopped before the error is shown.
pub(crate) const MAX_RECOVERIES: u32 = 3;
/// Playing this long without an error counts the last recovery as having worked.
pub(crate) const STABLE_AFTER: Duration = Duration::from_secs(15);

/// Whether the desktops have been hidden long enough to close the players.
pub(crate) fn unload_due(hidden_for: Duration, after: UnloadAfter) -> bool {
    after.delay().is_some_and(|delay| hidden_for >= delay)
}

/// Whether trying again could help. An unsupported format (4) never gets better by itself, while a
/// sleep, a graphics driver reset or a briefly unreadable file usually does.
pub(crate) fn is_recoverable(code: u32) -> bool {
    code != 4
}

/// The wait before restart number `attempt` (1, 2, 3...): 1 s, 2 s, 4 s, so a driver that is still
/// coming back from sleep has time to do so.
pub(crate) fn recovery_delay(attempt: u32) -> Duration {
    Duration::from_secs(1 << attempt.saturating_sub(1).min(4))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn live_wallpaper_is_off_until_switched_on() {
        let saved: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(saved, Settings::default());
        assert!(!saved.enabled && !saved.wants_player());
        assert!(!Settings { enabled: true, ..Default::default() }.wants_player());
        assert!(!Settings { path: "a.mov".into(), ..Default::default() }.wants_player());
    }

    #[test]
    fn fill_crops_the_longer_side_evenly_and_fit_crops_nothing() {
        let wide = source_rect(Fit::Fill, (2560, 1080), (1920, 1080));
        assert!((wide[0] - 0.125).abs() < 0.001 && (wide[2] - 0.875).abs() < 0.001);
        assert_eq!((wide[1], wide[3]), (0.0, 1.0));
        let tall = source_rect(Fit::Fill, (1080, 1920), (1920, 1080));
        assert!(tall[0] == 0.0 && tall[1] > 0.3 && (tall[1] + tall[3] - 1.0).abs() < 0.001);
        assert_eq!(source_rect(Fit::Fit, (2560, 1080), (1920, 1080)), [0.0, 0.0, 1.0, 1.0]);
        assert_eq!(source_rect(Fit::Fill, (0, 0), (1920, 1080)), [0.0, 0.0, 1.0, 1.0]);
    }

    #[test]
    fn pausing_on_battery_is_on_unless_saved_otherwise() {
        let saved: Settings = serde_json::from_str(r#"{"enabled":true,"path":"a.mp4","fit":"fit"}"#).unwrap();
        assert!(saved.pause_on_battery && saved.enabled && saved.fit == Fit::Fit);
        let off: Settings = serde_json::from_str(r#"{"pauseOnBattery":false}"#).unwrap();
        assert!(!off.pause_on_battery);
    }

    #[test]
    fn power_pauses_only_on_battery_or_battery_saver_and_only_when_asked() {
        assert!(paused_for_power(true, true, false));
        assert!(paused_for_power(true, false, true));
        assert!(!paused_for_power(true, false, false));
        assert!(!paused_for_power(false, true, true));
    }

    #[test]
    fn players_close_only_after_a_long_hidden_spell() {
        let three = UnloadAfter::ThreeMinutes;
        let delay = Duration::from_secs(180);
        assert!(!unload_due(Duration::ZERO, three));
        assert!(!unload_due(delay - Duration::from_millis(1), three));
        assert!(unload_due(delay, three));
    }

    #[test]
    fn the_unload_delay_follows_the_setting_and_never_means_never() {
        assert!(unload_due(Duration::from_secs(60), UnloadAfter::Minute));
        assert!(!unload_due(Duration::from_secs(599), UnloadAfter::TenMinutes));
        assert!(unload_due(Duration::from_secs(600), UnloadAfter::TenMinutes));
        assert!(!unload_due(Duration::from_secs(10 * 24 * 3600), UnloadAfter::Never));
        let saved: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(saved.unload_after, UnloadAfter::ThreeMinutes);
        let never: Settings = serde_json::from_str(r#"{"unloadAfter":"never"}"#).unwrap();
        assert_eq!(never.unload_after, UnloadAfter::Never);
    }

    #[test]
    fn only_an_unsupported_format_is_never_retried() {
        assert!(is_recoverable(3) && is_recoverable(1) && is_recoverable(99));
        assert!(!is_recoverable(4));
    }

    #[test]
    fn restarts_wait_longer_each_time() {
        let waits: Vec<u64> = (1..=MAX_RECOVERIES).map(|attempt| recovery_delay(attempt).as_secs()).collect();
        assert_eq!(waits, [1, 2, 4]);
        assert_eq!(recovery_delay(0).as_secs(), 1);
        assert_eq!(recovery_delay(u32::MAX).as_secs(), 16);
    }

    #[test]
    fn status_reaches_the_frontend_as_kind_and_message() {
        assert_eq!(serde_json::to_string(&Status::NoVideo).unwrap(), r#"{"kind":"noVideo"}"#);
        assert_eq!(serde_json::to_string(&Status::Error("x".into())).unwrap(), r#"{"kind":"error","message":"x"}"#);
    }
}
