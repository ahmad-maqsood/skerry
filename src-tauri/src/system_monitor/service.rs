use std::sync::{
    atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
    Mutex, OnceLock, PoisonError,
};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::win32::notification_state::{fullscreen_signal, FullscreenSignal};
use super::models::SystemSnapshot;
use super::sampler::SystemSampler;

pub const EVENT_SYSTEM_UPDATE: &str = "skerry-system-update";

pub struct SamplerManager {
    sampler: Mutex<SystemSampler>,
    subscribers: AtomicUsize,
    interval_secs: AtomicU64,
    running: AtomicBool,
}

static MANAGER: OnceLock<SamplerManager> = OnceLock::new();

fn get_manager() -> &'static SamplerManager {
    MANAGER.get_or_init(|| SamplerManager {
        sampler: Mutex::new(SystemSampler::new()),
        subscribers: AtomicUsize::new(0),
        interval_secs: AtomicU64::new(2),
        running: AtomicBool::new(false),
    })
}

impl SamplerManager {
    pub fn current_snapshot(&self) -> SystemSnapshot {
        let mut guard = self.sampler.lock().unwrap_or_else(PoisonError::into_inner);
        guard.sample()
    }

    pub fn start_sampling(&'static self, app: AppHandle, interval_secs: u64) {
        let clamped_interval = interval_secs.clamp(1, 10);
        self.interval_secs.store(clamped_interval, Ordering::SeqCst);

        let previous = self.subscribers.fetch_add(1, Ordering::SeqCst);
        if previous == 0 && !self.running.swap(true, Ordering::SeqCst) {
            tauri::async_runtime::spawn(async move {
                while self.running.load(Ordering::SeqCst)
                    && self.subscribers.load(Ordering::SeqCst) > 0
                {
                    let interval = self.interval_secs.load(Ordering::SeqCst).clamp(1, 10);
                    tokio::time::sleep(Duration::from_secs(interval)).await;

                    if self.subscribers.load(Ordering::SeqCst) == 0 {
                        break;
                    }

                    // Pause sampling while user is in full-screen games/apps
                    if fullscreen_signal() != FullscreenSignal::None {
                        continue;
                    }

                    let snapshot = self.current_snapshot();
                    let _ = app.emit_to(crate::island::WINDOW_LABEL, EVENT_SYSTEM_UPDATE, &snapshot);
                }
                self.running.store(false, Ordering::SeqCst);
            });
        }
    }

    pub fn stop_sampling(&self) {
        let _ = self.subscribers.try_update(Ordering::SeqCst, Ordering::SeqCst, |curr| {
            Some(curr.saturating_sub(1))
        });
        if self.subscribers.load(Ordering::SeqCst) == 0 {
            self.running.store(false, Ordering::SeqCst);
        }
    }
}

pub fn get_system_snapshot() -> SystemSnapshot {
    get_manager().current_snapshot()
}

pub fn start_system_sampling(app: AppHandle, interval_secs: u64) {
    get_manager().start_sampling(app, interval_secs);
}

pub fn stop_system_sampling() {
    get_manager().stop_sampling();
}
