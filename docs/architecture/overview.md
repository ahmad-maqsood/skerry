# Architecture Overview

This document describes the runtime architecture of Skerry, target code organization, migration mappings from legacy files to target locations, and the inventory of external contracts. Coding guidelines can be found in [AGENTS.md](../../AGENTS.md), [src/AGENTS.md](../../src/AGENTS.md), and [src-tauri/AGENTS.md](../../src-tauri/AGENTS.md); structural migration steps are detailed in [refactor-plan.md](refactor-plan.md); Plugin API v1 architecture is documented in [plugins.md](plugins.md) (with process tree cleanups encapsulated in `win32/process_job.rs`).

## Runtime Architecture

```text
┌──────────────────────── WebView2 (Same bundle, dispatched via ?window=) ────────────────────────┐
│  main: Island              translation: Quick Translation    settings: Settings (On-demand)     │
└────────────┬────────────────────────────────────────────────────────────────────────────────────┘
             │ invoke (Commands, req/res)          ▲ emit / emit_to (Events, backend broadcast)
             ▼                                     │
┌──────────────────────────────── Rust (Tauri 2) ─────────────────────────────────────────────────┐
│  lib.rs assembly: Plugins / setup / tray / generate_handler!                                    │
│  Domain modules: island · system · clipboard_history · file_shelf · media_control             │
│                  mail · qq_notifications · wechat_reminders · translation · settings_window     │
│  Background services: IMAP IDLE mail, clipboard watcher, notification listener,                 │
│                       WeChat alerts and snippets, mouse click-through loop                      │
└────────────┬────────────────────────────────────────────────────────────────────────────────────┘
             ▼
   Windows: Win32 / WinRT (SMTC media, audio endpoints, notifications, registry, windows), Credential Manager
```

Data storage locations are documented in [data-storage.md](data-storage.md).

Optional reverse synchronization of daily Markdown todos is coordinated serially by `features/todos/todoMarkdownSync.ts` (stable sampling, three-way merge, loop prevention), with `useTodoFileSync.ts` managing date/directory lifecycles and low-frequency polling; Rust `system/todo_sync.rs` provides restricted reads and version-checked writes. When disabled by default, unidirectional export in `todo_export.rs` continues to be used. Preferences, recovery copies, and data flows are documented in [data-storage.md](data-storage.md), with command contracts in [contracts.md](contracts.md).

Configuration transfer is handled by frontend `features/config-transfer/` and native `config_transfer/`; Win32 JSON dialogs are wrapped in `win32/file_dialog.rs`. Native modules restore permitted data files prior to service initialization; all WebViews await startup gating before React mounts, with only the main window confirming completion after applying localStorage. Transferrable portions of plugins and clipboard integrations are provided by their respective modules, without secrets crossing boundaries; anomalies retain retryable backups and file undo journals. Formats are detailed in [contracts.md](contracts.md).

Root `release-features.json` serves as the single source of truth for release feature flags across frontend and Rust: `plugins` and `mailOtp` are currently disabled; `pluginMarket` is enabled in release builds. The frontend reads via `features/releaseFlags.ts`, and `src-tauri/build.rs` converts the same configuration into compile-time cfgs exported by `release_flags.rs`. When disabled, legacy data and IPC contracts are preserved, plugin hosts avoid starting processes or requesting catalogs, mail sync does not parse verification codes, and copy shortcuts remain dormant. Re-enabling requires only toggling the JSON boolean and rebuilding. Regression runners launch production and feature-enabled Vite test instances separately; test coverage is not gated on production runtime switches.

WeChat process resolution, window ownership, and main window selection are unified in `wechat_reminders/source.rs`, shared by activation, alert monitoring, snippet extraction, and probe programs; exact path comparisons utilize canonicalize and normalization fallbacks in `win32/process.rs`. When WeChat snippets are active, the reminder service converts close button clicks to minimization via `win32/caption_close.rs`, managing taskbar buttons for minimized windows via `win32/taskbar.rs`.

## Target Architecture

The target directory trees and responsibilities for frontend and Rust are documented in [src/AGENTS.md](../../src/AGENTS.md#target-architecture) and [src-tauri/AGENTS.md](../../src-tauri/AGENTS.md#target-architecture) respectively. This document records only architecture overview and migration mappings.

Appearance color logic resides in `features/appearance/`: `HexColorInput` / `hexColor.ts` handles input, `colorPalette.ts` validates triplets, `colorRefresh.ts` coordinates one-off refresh, `colorPresets.ts` manages deduplication and limits, and `ColorPresetRow` renders chips; all backups, migration flags, and presets remain centralized in `storage.ts` using safe read/write helpers from `lib/storage.ts`.

### Frontend Dependency Direction

```text
main.tsx → windows/ → features/ → components/, lib/, utils/, i18n/, styles/
```

## Additional Documentation

- [data-storage.md](data-storage.md): Where data lives and which module owns it
- [contracts.md](contracts.md): Inventory of external contracts (localStorage keys, events, commands, file formats)
- [migration-map.md](migration-map.md): Legacy to target file mapping during refactoring

## Media Diagnostics and Local Calibration

`media_control/hotkeys.rs` manages its own hidden window for media global shortcuts, reusing clipboard chord parsers, `win32/hotkey` registration, and media workers; frontend `features/media/useMusicShortcuts.ts` synchronizes localStorage within the main window media hook, with settings pages managing edit and read states. Shortcut conflicts are arbitrated across domains in settings, always reserving approval keys.

Lyrics sources reside under `lyrics/`: QQ-specific interfaces and QRC decryption (`qqmusic.rs` / `qrc_cipher.rs`), Kugou native cache (`kugou_cache.rs`), Soda Music read-only LMDB snapshots and msgpackr decoding (`soda_cache.rs` / `soda_lmdb.rs` / `soda_msgpack.rs`), NetEase YRC and shared word-by-word format conversion (`word_formats.rs`), outputting enhanced LRC. Sourcing hierarchy, caching, and constraints in [Lyric Sources](../lyrics-sources.md).

`media_control/diagnostics.rs` enumerates SMTC sessions and recognized media processes in read-only mode, reusing trusted timestamp evaluations in `timeline.rs` and safe process queries in `win32/process*.rs`, with file versions read via `win32/file_version.rs`. Frontend `useMediaDiagnostics.ts` throttles refreshes to 5 seconds upon opening panels, switching players, or media events, independent of playback polling; `MediaDiagnosticsCard` and `MediaCompatibilitySection` display panel notices and settings rows. Clicking lyrics without timelines calibrates `trackClock` via `useMediaState.calibrate` without altering player states or `positionAnchor`.
- `src-tauri/src/media_plugins/`: Read-only probing, pinned download verification, explicit install / uninstall, and installation tracking for NetEase accurate progress plugins; elevated operations wrapped in `win32/media_plugin_elevation.rs`, registry probing in `win32/media_plugin_registry.rs`.

## Time, Weather, and Layout Preview 

Built-in plugin `clockWeather` is enabled via installation states in `features/plugins/native`. `features/weather/` encapsulates city/cache storage, IPC, pure WMO mappings, and time/weather leaf components; `src-tauri/src/weather/` wraps Open-Meteo requests. Main window `useCollapsedTodo` reserves status slot widths at low frequency, while `useCollapsedStatusWidth` measures actual sibling widths to protect text on narrow islands. Minute ticks remain in leaf components without triggering full window re-renders. Data and contracts in corresponding specifications.

Layout editors and `IslandPreview` share styling tokens in `features/appearance/islandPreviewStyle.ts`. Optional FLIP animation and cursor following in the generic sorting hook are enabled only for the editor; other consumers retain existing interactions.
