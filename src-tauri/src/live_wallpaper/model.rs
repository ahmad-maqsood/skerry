//! The live wallpaper's saved settings, status and the rules that need no desktop.

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

/// Mirrored by LiveWallpaperSettings in src/features/live-wallpaper/api.ts. Off by default.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub enabled: bool,
    pub path: String,
    pub fit: Fit,
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
    Error(String),
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
        _ => "The video stopped playing. Check that the file is still there, then switch live wallpaper off and on.",
    }
    .to_string()
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
    fn status_reaches_the_frontend_as_kind_and_message() {
        assert_eq!(serde_json::to_string(&Status::NoVideo).unwrap(), r#"{"kind":"noVideo"}"#);
        assert_eq!(serde_json::to_string(&Status::Error("x".into())).unwrap(), r#"{"kind":"error","message":"x"}"#);
    }
}
