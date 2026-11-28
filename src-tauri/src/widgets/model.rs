//! The desktop widgets' saved switches and positions. Every widget starts switched off.

use serde::{Deserialize, Serialize};

/// Where a widget's window sits, in physical screen pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct Position {
    pub x: i32,
    pub y: i32,
}

/// The file `widgets.json`. Left out of configuration transfer, as positions belong to one computer.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub(crate) struct Settings {
    pub clock: bool,
    pub clock_position: Option<Position>,
}

/// What the settings page sees. Mirrored by WidgetsState in src/features/widgets/api.ts.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WidgetsState {
    pub clock: bool,
}

impl Settings {
    pub(crate) fn state(&self) -> WidgetsState {
        WidgetsState { clock: self.clock }
    }
}

/// Whether a top-left corner leaves enough of a window of `size` on one of the `screens`
/// (left, top, right, bottom) for the person to find and grab it.
pub(crate) fn reachable(position: Position, size: (i32, i32), screens: &[(i32, i32, i32, i32)]) -> bool {
    let (width, height) = (size.0.max(1), size.1.max(1));
    screens.iter().any(|&(left, top, right, bottom)| {
        let across = (position.x + width).min(right) - position.x.max(left);
        let down = (position.y + height).min(bottom) - position.y.max(top);
        across >= width / 3 && down >= height / 3
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn widgets_are_off_until_switched_on() {
        let saved: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(saved, Settings::default());
        assert!(!saved.clock && saved.clock_position.is_none());
        assert!(!saved.state().clock);
    }

    #[test]
    fn a_saved_position_must_leave_the_widget_on_a_screen() {
        let screens = [(0, 0, 1920, 1080), (-1920, 0, 0, 1080)];
        let size = (560, 230);
        assert!(reachable(Position { x: 1200, y: 100 }, size, &screens));
        assert!(reachable(Position { x: -1500, y: 300 }, size, &screens));
        assert!(!reachable(Position { x: 1800, y: 100 }, size, &screens));
        assert!(!reachable(Position { x: 5000, y: 100 }, size, &screens));
        assert!(!reachable(Position { x: 100, y: 1070 }, size, &screens));
        assert!(!reachable(Position { x: 100, y: 100 }, size, &[]));
    }
}
