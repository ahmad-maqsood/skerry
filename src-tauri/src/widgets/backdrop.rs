//! What is behind a widget, boiled down for choosing readable colours: how bright it is and which
//! colour stands out in it. Pure, so it is tested without a desktop.

use serde::Serialize;

/// Matches WidgetBackdrop in src/features/widgets/api.ts.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Backdrop {
    /// Average relative luminance of the pixels behind the widget, 0 (black) to 1 (white).
    pub luminance: f32,
    /// The same pixels' average colour, as red, green, blue.
    pub average: [u8; 3],
    /// The most striking colour on the whole screen (the sun in a wallpaper, say), if any.
    pub accent: Option<[u8; 3]>,
}

const HUE_BINS: usize = 24;
/// A colour needs at least this share of a full-strength pixel's weight, as a fraction of all
/// pixels, to count as the screen's accent.
const ACCENT_SHARE: f32 = 0.004;

fn linear_table() -> [f32; 256] {
    let mut table = [0.0; 256];
    for (value, slot) in table.iter_mut().enumerate() {
        let c = value as f32 / 255.0;
        *slot = if c <= 0.04045 { c / 12.92 } else { ((c + 0.055) / 1.055).powf(2.4) };
    }
    table
}

/// `widget` is the pixels behind the widget and `screen` the whole monitor, both rows of BGRA.
pub(super) fn analyze(widget: &[u8], screen: &[u8]) -> Option<Backdrop> {
    let count = widget.len() / 4;
    if count == 0 {
        return None;
    }
    let table = linear_table();
    let (mut luminance, mut sum) = (0.0f64, [0.0f64; 3]);
    for pixel in widget.chunks_exact(4) {
        let (b, g, r) = (pixel[0], pixel[1], pixel[2]);
        sum[0] += f64::from(r);
        sum[1] += f64::from(g);
        sum[2] += f64::from(b);
        luminance += f64::from(0.2126 * table[r as usize] + 0.7152 * table[g as usize] + 0.0722 * table[b as usize]);
    }
    let n = count as f64;
    Some(Backdrop {
        luminance: (luminance / n) as f32,
        average: [(sum[0] / n).round() as u8, (sum[1] / n).round() as u8, (sum[2] / n).round() as u8],
        accent: accent_of(screen),
    })
}

fn accent_of(screen: &[u8]) -> Option<[u8; 3]> {
    let count = screen.len() / 4;
    if count == 0 {
        return None;
    }
    // Weight (saturation × brightness) and weighted colour per hue bin.
    let mut weight = [0.0f32; HUE_BINS];
    let mut colour = [[0.0f32; 3]; HUE_BINS];
    for pixel in screen.chunks_exact(4) {
        let (r, g, b) = (f32::from(pixel[2]) / 255.0, f32::from(pixel[1]) / 255.0, f32::from(pixel[0]) / 255.0);
        let (high, low) = (r.max(g).max(b), r.min(g).min(b));
        if high <= 0.0 {
            continue;
        }
        let saturation = (high - low) / high;
        if saturation < 0.35 || high < 0.3 {
            continue;
        }
        let spread = high - low;
        let hue = if high == r {
            ((g - b) / spread).rem_euclid(6.0)
        } else if high == g {
            (b - r) / spread + 2.0
        } else {
            (r - g) / spread + 4.0
        };
        let bin = ((hue / 6.0 * HUE_BINS as f32) as usize).min(HUE_BINS - 1);
        let strength = saturation * high;
        weight[bin] += strength;
        colour[bin][0] += strength * r;
        colour[bin][1] += strength * g;
        colour[bin][2] += strength * b;
    }
    // A hue straddles bin edges, so each candidate counts its two neighbours too.
    let score = |bin: usize| weight[(bin + HUE_BINS - 1) % HUE_BINS] + weight[bin] + weight[(bin + 1) % HUE_BINS];
    let best = (0..HUE_BINS).max_by(|a, b| score(*a).total_cmp(&score(*b)))?;
    let total = score(best);
    if total < ACCENT_SHARE * count as f32 {
        return None;
    }
    let mut mixed = [0.0f32; 3];
    for bin in [(best + HUE_BINS - 1) % HUE_BINS, best, (best + 1) % HUE_BINS] {
        for (channel, value) in mixed.iter_mut().enumerate() {
            *value += colour[bin][channel];
        }
    }
    Some([0, 1, 2].map(|channel| (mixed[channel] / total * 255.0).round().clamp(0.0, 255.0) as u8))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fill(r: u8, g: u8, b: u8, pixels: usize) -> Vec<u8> {
        (0..pixels).flat_map(|_| [b, g, r, 255]).collect()
    }

    #[test]
    fn brightness_follows_the_pixels_behind_the_widget() {
        let light = analyze(&fill(240, 240, 240, 100), &[]).unwrap();
        let dark = analyze(&fill(10, 10, 12, 100), &[]).unwrap();
        assert!(light.luminance > 0.8 && dark.luminance < 0.01);
        assert_eq!(light.average, [240, 240, 240]);
        assert!(analyze(&[], &[]).is_none());
    }

    #[test]
    fn a_red_sun_on_a_pale_screen_is_the_accent() {
        let mut screen = fill(236, 232, 228, 9000);
        screen.extend(fill(228, 30, 40, 1000));
        let accent = analyze(&fill(236, 232, 228, 10), &screen).unwrap().accent.unwrap();
        assert!(accent[0] > 200 && accent[1] < 80 && accent[2] < 80, "{accent:?}");
    }

    #[test]
    fn a_grey_screen_or_a_few_stray_pixels_have_no_accent() {
        assert_eq!(analyze(&fill(1, 1, 1, 4), &fill(120, 120, 120, 1000)).unwrap().accent, None);
        let mut screen = fill(120, 120, 120, 10000);
        screen.extend(fill(0, 200, 0, 3));
        assert_eq!(analyze(&fill(1, 1, 1, 4), &screen).unwrap().accent, None);
    }

    #[test]
    fn the_strongest_hue_wins_even_across_the_red_seam() {
        let mut screen = fill(120, 120, 120, 5000);
        screen.extend(fill(230, 20, 60, 400));
        screen.extend(fill(230, 40, 20, 400));
        screen.extend(fill(30, 60, 230, 300));
        let accent = analyze(&fill(1, 1, 1, 4), &screen).unwrap().accent.unwrap();
        assert!(accent[0] > 200 && accent[2] < 100, "{accent:?}");
    }
}
