//! Safe wrappers around Win32 / COM calls. New `unsafe` code lives only in this
//! module; callers elsewhere use the safe functions it exposes.

pub(crate) mod audio;
pub(crate) mod clipboard;
pub(crate) mod com;
pub(crate) mod consent_store;
pub(crate) mod desktop_duplication;
pub(crate) mod folder_dialog;
pub(crate) mod file_dialog;
pub(crate) mod hotkey;
pub(crate) mod icon;
pub(crate) mod input;
pub(crate) mod known_folder;
pub(crate) mod message_window;
pub(crate) mod notification_state;
pub(crate) mod ole;
pub(crate) mod power;
pub(crate) mod process;
pub(crate) mod process_job;
#[cfg(test)]
pub(crate) mod process_tree;
pub(crate) mod registry;
pub(crate) mod std_handle;
pub(crate) mod task_switcher;
pub(crate) mod taskbar_edge;
pub(crate) mod wifi;
pub(crate) mod window;
