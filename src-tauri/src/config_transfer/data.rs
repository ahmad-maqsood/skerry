use std::{collections::BTreeMap, path::Path};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Manager;
use crate::{clipboard_history::transfer::ClipboardTransfer, plugin_host::transfer::PluginTransfer};

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub(crate) struct TransferFiles {
    pub launch_at_startup: bool,
    pub plugins: PluginTransfer,
    pub clipboard: ClipboardTransfer,
    pub data: BTreeMap<String, Value>,
}

const JSON_FILES: [&str; 3] = ["file-shelf.json", "app-log.json", "media-plugins-auto.json"];

pub(super) async fn collect(app: &tauri::AppHandle, history: bool) -> Result<TransferFiles, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut data = BTreeMap::new();
    for name in JSON_FILES {
        let path = root.join(name);
        if !path.exists() { continue; }
        let bytes = super::transaction::read_limited(&path, 16 * 1024 * 1024)?;
        let mut value: Value = serde_json::from_slice(&bytes).map_err(|e| format!("Cannot back up {name}: {e}"))?;
        // Installation attempts name directories on the old machine; only the opt-out is a preference.
        if name == "media-plugins-auto.json" { value = serde_json::json!({ "version": 1, "optedOut": value["optedOut"].as_bool().unwrap_or(false), "attempted": [] }); }
        data.insert(name.into(), value);
    }
    let files = TransferFiles {
        launch_at_startup: crate::system::startup::is_enabled()?,
        plugins: crate::plugin_host::transfer::export(&root),
        clipboard: crate::clipboard_history::transfer::export(history)?,
        data,
    };
    files.validate()?;
    Ok(files)
}

impl TransferFiles {
    pub(super) fn includes_history(&self) -> bool { self.clipboard.includes_history() }

    pub(super) fn validate(&self) -> Result<(), String> {
        self.plugins.validate()?;
        self.clipboard.validate()?;
        for (name, value) in &self.data {
            if !JSON_FILES.contains(&name.as_str()) || !value.is_object() { return Err("Unknown or invalid configuration data file".into()); }
            match name.as_str() {
                "file-shelf.json" if !value["items"].is_array() => return Err("Invalid file shelf".into()),
                "app-log.json" if !value["enabled"].is_boolean() => return Err("Invalid log preferences".into()),
                "media-plugins-auto.json" if value["version"] != 1 || !value["optedOut"].is_boolean()
                    || value["attempted"].as_array().is_none_or(|v| !v.is_empty()) => return Err("Invalid media plugin preferences".into()),
                _ => {}
            }
        }
        Ok(())
    }

    pub(super) fn plan(&self, root: &Path) -> Result<(super::transaction::FilePlan, Vec<String>), String> {
        self.validate()?;
        let mut plan = super::transaction::FilePlan::new();
        for name in JSON_FILES {
            let bytes = self.data.get(name).map(serde_json::to_vec_pretty).transpose().map_err(|e| e.to_string())?;
            plan.insert(root.join(name), bytes);
        }
        for (path, bytes) in self.clipboard.plan(root)? { plan.insert(path, Some(bytes)); }
        let (registry, missing, pending) = self.plugins.plan(root)?;
        plan.insert(root.join("plugins-state.json"), Some(serde_json::to_vec_pretty(&registry).map_err(|e| e.to_string())?));
        plan.insert(root.join("plugins-restore.json"), Some(pending));
        Ok((plan, missing))
    }
}
