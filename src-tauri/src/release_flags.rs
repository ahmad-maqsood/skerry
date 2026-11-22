//! Compile-time switches from the shared release-features.json.

pub const PLUGINS_ENABLED: bool = cfg!(skerry_plugins);
