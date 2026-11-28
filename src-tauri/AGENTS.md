# Rust / Tauri Rules (src-tauri/)

Applies to all files under `src-tauri/`, supplementing the root [AGENTS.md](../AGENTS.md) with native-side details. For mappings of modules moved from legacy locations to new locations, see [docs/architecture/migration-map.md](../docs/architecture/migration-map.md).

## Target Architecture

```text
src-tauri/src/
├── main.rs                  # Calls skerry_lib::run() only
├── lib.rs                   # mod declarations and run() only: plugins, setup, tray, collect_commands! (aggregates tauri_commands! from each module)
├── tray.rs                  # Tray menu and events: show / hide combined into a single item, displayed according to whether the island is currently visible
├── island/                  # Main window: commands, window state, geometric calculation, frosted glass, mouse click-through, tuck animations
├── app_log/                 # Troubleshooting logs (disabled by default): pipes stderr to logs/ when enabled, frontend errors written via append_app_log; file.rs handles single-backup rotation
├── system/                  # Auto-start on boot (registry), updater proxy and configuration, todo Markdown export and restricted sync read/write (todo_sync), focusing own windows without synthesizing Alt keys (window_focus)
├── clipboard_history/
├── config_transfer/         # Configuration backup / transfer: native file dialogs, restricted data and sound pack collection, startup restore, and undo logs
├── file_shelf/              # File shelf: path list (file-shelf.json) and commands; drag-out invokes win32/ole.rs
├── media_control/           # diagnostics.rs: SMTC, processes, versions, and player read-only diagnostics; hotkeys.rs: optional music global shortcuts, registration status, and existing media session control
├── live_wallpaper/          # Opt-in video wallpaper behind the desktop icons (off by default): saved switch, worker thread that pauses per screen while the desktop is hidden
├── widgets/                 # Opt-in desktop widgets (off by default), the clock first: saved switches and positions (widgets.json), a window per widget at the bottom of the window order that takes no focus, and a Desktop Duplication look at what is behind it (backdrop.rs, sampler.rs) so the page can pick readable colours
├── lyrics/                  # Local LRC, LRCLIB; online results cached in lyrics-cache/
├── device_status/           # Device pop-up sources polled by the island: connected Bluetooth devices (WinRT device enumeration) and airplane mode (registry)
├── system_notifications/  # Generic Windows system notification listener (WinRT UserNotificationListener), history, logo cache, per-app mute, privacy filter
├── weather/                 # Time and weather: Open-Meteo city search and current weather async commands, no auto-geolocation, no native data files written
├── translation/             # Quick translation: window, global hotkeys, credentials, and translation requests (mod.rs)
├── settings_window/         # Settings window: on-demand creation and display (mod.rs); sizing.rs scales window dimensions per screen, shared with clipboard window
├── clipboard_window/        # Clipboard history standalone window: on-demand creation, display, closing, and position memory
└── win32/                   # Safe wrappers for Win32 / COM, the ONLY location where unsafe is permitted in the crate: window (window querying, enumeration, foreground switching),
                             # message_window (hidden message window with safe window procedure), hotkey, clipboard, shell_hook, input,
                             # com (COM / WinRT initialization guard), audio, ole (file drag-out), process / process_times, process_job (plugin process tree cleanup on exit), registry,
                             # notification_state (fullscreen application detection), shell_open (protocol opening without system error dialogs),
                             # task_switcher (keeps main window out of Alt+Tab), known_folder (known folders such as Downloads),
                             # icon, process_env / process_tree / process_memory, file_version (exe file version), desktop_layer (windows behind the desktop icons), video_player (Media Foundation playback), std_handle (redirecting stderr, local time), uia_tabs / uia_list, caption_close, taskbar
```

## lib.rs and Module Organization

- `lib.rs` handles assembly only: `mod` declarations, plugin registration, `setup`, tray creation, command registration. Do not write business logic or define commands here.
- Command lists do not live in `lib.rs`: each module with commands defines its list in its `mod.rs` using the `tauri_commands!` macro (using full paths starting with `crate::`, such as `crate::mail::refresh_qq_mail`; commands from submodules are also listed in the top-level module), and `collect_commands!` in `lib.rs` joins all module lists into a single `generate_handler!`. Adding a new command only requires modifying `tauri_commands!` in that module; only when introducing a new module with commands do you add the module name to `collect_commands!([] ...)`. Place `tauri_commands!` before inline test modules (to satisfy clippy `items_after_test_module`).
- When a file exceeds 800 lines or assumes multiple responsibilities, convert it into a directory module `foo/mod.rs` with sub-files. Common splits:

  | File | Contents |
  |---|---|
  | `mod.rs` | Thin `#[tauri::command]` layer, `init()`, public types |
  | `service.rs` / `state.rs` | Background threads, global state, event broadcasting |
  | Domain files (e.g. `content.rs`, `geometry.rs`) | Pure logic, straightforward to unit test |
  | `tests.rs` | Test module, extracted from source file when exceeding 150 lines |

- Modules expose only commands, `init()`, and types needed by the frontend; keep everything else `pub(crate)` or private.
- Do not create miscellaneous modules like `utils.rs` or `common.rs`. When common code is genuinely necessary, name files by purpose (e.g. `win32/registry.rs`, `fs_write.rs`).

## Commands

- Commands return `Result<T, String>`. Error messages must be human-readable, as the frontend displays them verbatim.
- Commands that block, or commands that invoke windows, COM, or Windows UI, must be declared `async` to avoid blocking the IPC thread (which can cause deadlocks on Windows; see `settings_window/mod.rs`).
- Keep command functions thin: validate arguments, then delegate to service or domain functions.
- Command names equal function names and represent external contracts. During pure refactoring you may move functions between modules, but never rename functions or parameters.
- Define event names as `const` within modules. When emitting events to a specific window, use window label constants (such as `settings_window::WINDOW_LABEL`) rather than string literals.
- After adding a command, update the corresponding `api.ts` in the frontend synchronously. If plugin permissions are involved, update `capabilities/default.json`. New window labels must be added to the capabilities `windows` list.

## Error Handling

- Production code strictly forbids `unwrap()` and `expect()`. Use is permitted only when provably impossible to fail (such as parsing literal constants), and must be accompanied by a comment explaining the rationale. Test code is exempt from this rule.
- Acquire `Mutex` locks using `lock().map_err(...)` or `unwrap_or_else(PoisonError::into_inner)` to prevent lock poisoning from crashing the entire application.
- Discarding errors via `let _ = ...` is reserved exclusively for best-effort operations, such as emitting events or cleaning up temporary files.
- Perform error conversion locally using `map_err(|error| error.to_string())` or contextual `format!`, never swallowing raw error details.

## unsafe and Windows API

- **`unsafe` is restricted strictly to `win32/`**, exposing safe functions externally, taking Rust types where possible (`&str`, `u32`), and never requiring callers to pass raw pointers. Outside `win32/`, production code contains zero `unsafe`. Window procedures implement `win32::message_window::WindowMessages`, and window enumeration uses closures via `win32::window::for_each_top_level_window`.
- Tests that depend on a live desktop environment (notification permissions) must be marked `#[ignore = "reason"]` and kept out of the default test suite.
- Probe programs in `examples/` are run manually via `cargo run --example <name>` to diagnose compatibility issues, and do not contain production logic.

## Configuration and Building

- When modifying window configurations in `tauri.conf.json`, check `capabilities/default.json`, frontend window routing in `main.tsx`, and Rust label constants simultaneously.
- Clippy lints are declared in `Cargo.toml` under `[lints.clippy]` (`undocumented_unsafe_blocks`, `unwrap_used`, `expect_used` are set to deny); test code exemptions live in `clippy.toml`. Do not duplicate `#![warn]` / `#[allow]` declarations in source files. Maintain 0 warnings under `cargo clippy --all-targets`. For exceptional default lints that cannot be eliminated (e.g. IPC contract commands triggering `too_many_arguments`), apply `#[expect(...)]` with an explicit `reason`.
- Validation: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm tauri build --no-bundle`. For changes affecting window, tray, or registry behavior, manually inspect collapsed, expanded, tucked, and tray-hidden states via `pnpm tauri dev` when risk requires.
- After successfully building the release executable, sync desktop shortcuts following root rules.

Plugin API v1: `plugin_host/` layers manifest, protocol, packages, storage, process, and service; plugin source code resides in separate crates under `plugins/<id>/`; these crates are not part of the main workspace. New plugins must not introduce network, database, or client dependencies into the main application.
