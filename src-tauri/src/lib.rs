mod app_log;
mod brightness;
mod changelog;
mod clipboard_history;
mod clipboard_window;
mod config_transfer;
mod device_status;
mod file_shelf;
mod island;
mod live_wallpaper;
mod lyrics;
mod media_control;
mod plugin_host;
mod privacy_indicator;
mod release_flags;
mod settings_window;
mod system;
mod system_monitor;
mod system_notifications;
mod translation;
mod tray;
mod weather;
mod widgets;
mod win32;

use tauri::WindowEvent;

/// Chains each module's `tauri_commands!` list into a single `generate_handler!`.
macro_rules! collect_commands {
    ([$($done:tt)*]) => {
        tauri::generate_handler![$($done)*]
    };
    ([$($done:tt)*] $module:ident $(; $rest:ident)*) => {
        $module::tauri_commands!(collect_commands [$($done)*] $($rest);*)
    };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    system::startup::note_launch();
    let context = tauri::generate_context!();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::on_relaunch(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .on_window_event(|window, event| {
            if window.label() == "translation" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
                return;
            }
            if window.label() != island::WINDOW_LABEL {
                return;
            }

            if let WindowEvent::Moved(position) = event {
                island::record_dragged_position(*position);
            }
        })
        .setup(|app| {
            config_transfer::prepare(app.handle());
            app_log::init(app.handle());
            tray::build_tray(app)?;
            if let Err(error) = clipboard_history::init(app.handle()) {
                eprintln!("failed to initialize clipboard history: {error}");
            }
            translation::init(app.handle());
            if let Err(error) = file_shelf::init(app.handle()) {
                eprintln!("failed to initialize the file shelf: {error}");
            }
            if let Err(error) = system_notifications::init(app.handle()) {
                eprintln!("failed to initialize system notifications: {error}");
            }
            if let Ok(window) = island::main_window(app.handle()) {
                if let Err(error) = island::apply_stage_geometry(
                    &window,
                    island::IslandWindowState::default(),
                    false,
                ) {
                    eprintln!("failed to size and position island window: {error}");
                }
                if !window.hwnd().is_ok_and(win32::task_switcher::hide_from_task_switcher) {
                    eprintln!("failed to keep the island window out of Alt+Tab");
                }
                island::start_monitor_follow_loop(window.clone());
                island::start_cursor_passthrough_loop(window);
            }
            system::fullscreen::start(app.handle());
            live_wallpaper::init(app.handle());
            widgets::init(app.handle());
            if let Err(error) = plugin_host::init(app.handle()) {
                eprintln!("failed to initialize plugins: {error}");
            }
            system::startup::ensure_default_on_first_run(app.handle());
            system::startup::upgrade_legacy_value();
            Ok(())
        })
        .invoke_handler(collect_commands!([]
            file_shelf;
            system_notifications;
            island;
            system;
            media_control;
            plugin_host;
            lyrics;
            clipboard_history;
            translation;
            settings_window
            ; tray
            ; clipboard_window
            ; app_log
            ; config_transfer
            ; weather
            ; system_monitor
            ; privacy_indicator
            ; brightness
            ; device_status
            ; changelog
            ; live_wallpaper
            ; widgets
        ))
        .build(context)
        .map(|app| {
            app.run(|handle, event| {
                if let tauri::RunEvent::Exit = event {
                    clipboard_history::flush();
                    clipboard_window::remember_bounds(handle);
                    plugin_host::shutdown(handle);
                    live_wallpaper::shutdown();
                    widgets::shutdown(handle);
                }
            })
        });
    if let Err(error) = result {
        eprintln!("error while running Skerry: {error}");
    }
}
