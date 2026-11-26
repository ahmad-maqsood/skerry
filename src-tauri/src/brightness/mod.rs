//! Screen brightness of a laptop's built-in display, through the Windows WMI brightness classes.
//!
//! The classes live in `root/WMI` and are answered by the panel driver, so only a laptop's own
//! screen has them: desktop PCs and external monitors report no brightness, and the island then
//! hides its slider.
//!
//! One thread keeps a WMI connection open and answers every read and change. Starting a PowerShell
//! process for each, as before, made the slider and the brightness pop-up lag by seconds.

use std::sync::{
    mpsc::{self, Receiver, Sender},
    OnceLock,
};

use serde::{Deserialize, Serialize};
use wmi::WMIConnection;

use crate::win32::com::ComApartment;

const NAMESPACE: &str = "ROOT\\WMI";
const READ_QUERY: &str = "SELECT CurrentBrightness FROM WmiMonitorBrightness";
const METHODS_QUERY: &str = "SELECT * FROM WmiMonitorBrightnessMethods";
const UNSUPPORTED: &str = "This display does not report or accept a brightness.";
/// The lowest brightness the island sets: 0 turns some panels fully dark, with no way back by eye.
const MIN_PERCENT: u8 = 5;
const MAX_PERCENT: u8 = 100;

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct WmiMonitorBrightness {
    current_brightness: u8,
}

#[derive(Deserialize)]
struct WmiMonitorBrightnessMethods {
    #[serde(rename = "__Path")]
    path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct SetBrightnessInput {
    /// Seconds the driver may take over the change.
    timeout: u32,
    brightness: u8,
}

enum Request {
    Read(Sender<Result<u8, String>>),
    Set(u8, Sender<Result<(), String>>),
}

fn clamp_percent(percent: u8) -> u8 {
    percent.clamp(MIN_PERCENT, MAX_PERCENT)
}

fn read_from(connection: &WMIConnection) -> Result<u8, String> {
    let displays: Vec<WmiMonitorBrightness> = connection
        .raw_query(READ_QUERY)
        .map_err(|error| format!("{UNSUPPORTED} ({error})"))?;
    displays
        .first()
        .map(|display| display.current_brightness)
        .filter(|percent| *percent <= MAX_PERCENT)
        .ok_or_else(|| UNSUPPORTED.to_string())
}

fn set_on(connection: &WMIConnection, percent: u8) -> Result<(), String> {
    let failed = |error: wmi::WMIError| format!("{UNSUPPORTED} ({error})");
    let displays: Vec<WmiMonitorBrightnessMethods> =
        connection.raw_query(METHODS_QUERY).map_err(failed)?;
    if displays.is_empty() {
        return Err(UNSUPPORTED.to_string());
    }
    for display in displays {
        // WmiSetBrightness returns nothing the island needs, and some drivers return nothing at all.
        connection
            .exec_instance_method::<WmiMonitorBrightnessMethods, ()>(
                &display.path,
                "WmiSetBrightness",
                SetBrightnessInput {
                    timeout: 1,
                    brightness: percent,
                },
            )
            .map_err(failed)?;
    }
    Ok(())
}

/// Runs `action` on the open connection, opening one first if there is none. A failure drops the
/// connection, so the next request starts afresh (after sleep, or a restarted WMI service).
fn with_connection<T>(
    slot: &mut Option<WMIConnection>,
    action: impl FnOnce(&WMIConnection) -> Result<T, String>,
) -> Result<T, String> {
    let connection = match slot.take() {
        Some(connection) => connection,
        None => WMIConnection::with_namespace_path(NAMESPACE)
            .map_err(|error| format!("Could not connect to WMI: {error}"))?,
    };
    let result = action(&connection);
    if result.is_ok() {
        *slot = Some(connection);
    }
    result
}

fn serve(requests: Receiver<Request>) {
    // Declared before the connection, so COM is left only after the connection is gone.
    let _com = match ComApartment::multithreaded() {
        Ok(com) => com,
        Err(error) => {
            eprintln!("Brightness is unavailable, COM did not start: {error}");
            return;
        }
    };
    let mut connection = None;
    for request in requests {
        match request {
            Request::Read(reply) => {
                let _ = reply.send(with_connection(&mut connection, read_from));
            }
            Request::Set(percent, reply) => {
                let _ = reply.send(with_connection(&mut connection, |open| {
                    set_on(open, percent)
                }));
            }
        }
    }
}

/// Sends one request to the brightness thread and waits for its answer.
fn ask<T>(request: impl FnOnce(Sender<Result<T, String>>) -> Request) -> Result<T, String> {
    static WORKER: OnceLock<Sender<Request>> = OnceLock::new();
    let worker = WORKER.get_or_init(|| {
        let (sender, requests) = mpsc::channel();
        std::thread::spawn(move || serve(requests));
        sender
    });
    let (reply, answer) = mpsc::channel();
    let stopped = || "The brightness service is not running.".to_string();
    worker.send(request(reply)).map_err(|_| stopped())?;
    answer.recv().map_err(|_| stopped())?
}

/// The built-in display's brightness in percent, or `None` where the display does not report one.
#[tauri::command]
pub async fn get_brightness() -> Result<Option<u8>, String> {
    tauri::async_runtime::spawn_blocking(|| ask(Request::Read).ok())
        .await
        .map_err(|error| format!("Failed to join the brightness task: {error}"))
}

#[tauri::command]
pub async fn set_brightness(percent: u8) -> Result<(), String> {
    let percent = clamp_percent(percent);
    tauri::async_runtime::spawn_blocking(move || ask(|reply| Request::Set(percent, reply)))
        .await
        .map_err(|error| format!("Failed to join the brightness task: {error}"))?
}

macro_rules! tauri_commands {
    ($next:ident [$($done:tt)*] $($rest:tt)*) => {
        $next!([$($done)*
            crate::brightness::get_brightness,
            crate::brightness::set_brightness,
        ] $($rest)*)
    };
}
pub(crate) use tauri_commands;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_change_stays_between_the_lowest_and_full_brightness() {
        assert_eq!(clamp_percent(0), MIN_PERCENT);
        assert_eq!(clamp_percent(50), 50);
        assert_eq!(clamp_percent(255), MAX_PERCENT);
    }
}
