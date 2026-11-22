//! Bounded, de-duplicated history buffer of Windows system notifications.

use std::collections::HashMap;

use super::{KnownApp, SystemNotification};

pub const MAX_ITEMS: usize = 50;

#[derive(Default)]
pub struct NotificationBuffer {
    pub(crate) baseline: Option<HashMap<String, SystemNotification>>,
    pub items: Vec<SystemNotification>,
    pub known_apps: HashMap<String, KnownApp>,
}

impl NotificationBuffer {
    pub fn sync(
        &mut self,
        mut current: Vec<SystemNotification>,
        muted_apps: &[String],
        hide_text: bool,
    ) -> Option<String> {
        current.sort_by_key(|item| item.timestamp);
        let mut newest = None;

        for item in &current {
            self.known_apps
                .entry(item.app_id.clone())
                .or_insert_with(|| KnownApp {
                    app_id: item.app_id.clone(),
                    app_display_name: item.app_display_name.clone(),
                    app_logo: item.app_logo.clone(),
                });
        }

        if let Some(previous) = &self.baseline {
            for item in &current {
                if muted_apps
                    .iter()
                    .any(|m| m.eq_ignore_ascii_case(&item.app_id))
                {
                    continue;
                }

                if previous.get(&item.id) != Some(item) {
                    let is_duplicate = self.items.iter().any(|existing| {
                        existing.id == item.id
                            || (existing.app_id == item.app_id
                                && existing.title == item.title
                                && existing.body == item.body
                                && (existing.timestamp - item.timestamp).abs() < 2_000)
                    });

                    if !is_duplicate {
                        let mut stored = item.clone();
                        if hide_text {
                            stored.body.clear();
                            stored.body_lines.clear();
                        }
                        self.items.retain(|existing| existing.id != item.id);
                        self.items.insert(0, stored);
                        self.items.truncate(MAX_ITEMS);
                        newest = Some(item.id.clone());
                    }
                }
            }
        }

        self.baseline = Some(
            current
                .into_iter()
                .map(|item| (item.id.clone(), item))
                .collect(),
        );

        newest
    }

    pub fn dismiss_item(&mut self, id: &str) -> bool {
        let before = self.items.len();
        self.items.retain(|item| item.id != id);
        self.items.len() != before
    }

    pub fn dismiss_app(&mut self, app_id: &str) -> bool {
        let before = self.items.len();
        self.items.retain(|item| !item.app_id.eq_ignore_ascii_case(app_id));
        self.items.len() != before
    }

    pub fn clear(&mut self) {
        self.items.clear();
    }
}
