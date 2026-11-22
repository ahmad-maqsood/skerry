use serde::Serialize;
use super::session;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MediaDiagnostics {
    players: Vec<PlayerDiagnostic>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerDiagnostic {
    source_app_id: String,
    label: String,
    has_session: bool,
    has_timeline: bool,
    has_plugin_track_id: bool,
    exe_path: Option<String>,
    directory: Option<String>,
    version: Option<String>,
    status: &'static str,
    netease_plugin_state: Option<&'static str>,
}

pub(super) fn get() -> Result<MediaDiagnostics, String> {
    session::on_media_thread(|| {
        let manager = session::request_manager()?;
        let sessions = manager.GetSessions().map_err(|error| error.to_string())?;
        let mut players = Vec::new();
        for index in 0..sessions.Size().map_err(|error| error.to_string())? {
            let item = sessions.GetAt(index).map_err(|error| error.to_string())?;
            let Some(id) = session::session_id(&item) else { continue; };
            let timeline = session::timeline_sample(&item).is_some_and(|sample| sample.has_timeline(session::current_unix_millis()));
            players.push(PlayerDiagnostic {
                label: session::friendly_app_label(&id),
                status: if timeline { "ok" } else { "noTimeline" },
                netease_plugin_state: None,
                directory: None,
                source_app_id: id,
                has_session: true,
                has_timeline: timeline,
                has_plugin_track_id: false,
                exe_path: None,
                version: None,
            });
        }
        Ok(MediaDiagnostics { players })
    })
}
