# AGENTS.md

This document serves as the master rulebook for AI coding agents working in this repository. Rules apply on a closest-directory basis:

- When modifying `src/`, also follow [src/AGENTS.md](src/AGENTS.md) (frontend rules).
- When modifying `src-tauri/`, also follow [src-tauri/AGENTS.md](src-tauri/AGENTS.md) (Rust / Tauri rules).
- Target architecture is documented in [docs/architecture/overview.md](docs/architecture/overview.md).

Subdirectory rules are more specific than this file. In case of conflict, subdirectory rules take precedence.

## Project Overview

**Skerry** (repository name and installer package name `skerry`) is a Windows-first desktop productivity tool running as a transparent, borderless, always-on-top Tauri floating island. Core features include: todos, daily notes and archiving, appearance settings and presets, media controls, clipboard history, file shelf, quick translation, system notifications, system monitor, configuration backup / transfer, a plugin host (switched on through `release-features.json`), and automatic updates.

The application has four windows, dispatched on the frontend via the `?window=` parameter at the single entry point:

| Window Label | Frontend Entry Point | Description |
|---|---|---|
| `main` | Default | Floating island itself: collapsed state / expanded state / tucked state |
| `translation` | `?window=translation` | Quick translation window, persistent, toggles visibility |
| `clipboard` | `?window=clipboard` | Independent clipboard history window, `create: false`, created on demand when enabled in settings, always on top by default |
| `settings` | `?window=settings` | Settings window, `create: false`, created on demand |

Code is organized according to the target structure: Rust-side `unsafe` blocks only exist in `src-tauri/src/win32/`, production code does not use `unwrap` / `expect`, and both clippy and ESLint have 0 warnings.

## Tech Stack

- Frontend: React 19, TypeScript (strict), Vite 7, icons via lucide-react
- Desktop Shell: Tauri 2 (opener, updater, single-instance plugins)
- Native Capabilities: Rust 2021, `windows` crate (Win32 / WinRT)
- Package Manager: pnpm 11; frontend unit tests use Node built-in `node:test`

## Directory Map

```text
.
├── src/                 # React frontend (rules in src/AGENTS.md)
├── src-tauri/           # Tauri / Rust desktop side (rules in src-tauri/AGENTS.md)
│   ├── src/             # Native commands, background services, window management
│   ├── capabilities/    # Tauri permission capability configs
│   ├── nsis/            # NSIS installer hooks
│   └── tauri.conf.json  # Window, updater, and packaging configurations
├── plugins/             # Plugin API v1: sdk/ and example plugin crates (separate Cargo workspace, not part of src-tauri)
├── tests/               # unit/ frontend unit tests, scripts/ script tests; regression/ browser regression pages; screenshots/ screenshot scenes
├── scripts/             # release/ packaging, signing, and latest.json generation; root scripts (regression runner, screenshots, size check)
├── docs/                # Specialized documentation: architecture/, design/, plugins/, updater.md, SCREENSHOTS.md
├── .github/workflows/   # ci.yml, release.yml
├── release-features.json # Release feature flags shared by the frontend and Rust (currently only `plugins`)
├── DESIGN.md            # Confirmed UI design conventions
└── README.md            # Project documentation
```

## Common Commands

| Purpose | Command |
|---|---|
| Install dependencies | `pnpm install` |
| Frontend dev server | `pnpm dev` |
| Desktop dev mode | `pnpm tauri dev` |
| Typecheck and build frontend | `pnpm build` |
| Frontend unit tests | `pnpm test` |
| Frontend static analysis | `pnpm lint` |
| File size check | `pnpm check:size` |
| Regression test typecheck | `pnpm check:tests-types` |
| Browser regression tests | `pnpm test:regression [filter keyword]` |
| Pre-commit check | `pnpm check` |
| Rust unit tests | `cargo test --manifest-path src-tauri/Cargo.toml` (CI runs `--lib`) |
| Rust lints | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` |
| Plugin crates | `cargo test --manifest-path plugins/Cargo.toml --workspace` (and the same for clippy) |
| Refresh README screenshots (by hand, never in CI) | `pnpm screenshots` (see [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)) |
| Generate release binary only | `pnpm tauri build --no-bundle` |
| Full package build | `pnpm tauri build` |
| Release | `pnpm release` |

## Code Scale Rules (Global)

Upper limit on physical line count per file:

| File Type | Limit |
|---|---|
| `.ts` / `.tsx` / `.mjs` | 400 lines |
| `.css` | 500 lines |
| `.rs` | 800 lines (excluding inline test modules) |
| `.ps1` / `.cmd` | 400 lines |

- `pnpm check:size` (`scripts/check-file-size.mjs`) checks these rules. i18n dictionaries (`src/i18n/`) and extracted Rust `tests.rs` files are exempt; files already over a limit may only be listed in `scripts/file-size-allowlist.json` and may only shrink.
- Each file serves a single responsibility.

## External Contracts

The following identifiers are referenced by existing user data, configurations, or external programs:

- `localStorage` keys (`skerry-*`, full list in [contracts.md](docs/architecture/contracts.md))
- Tauri command names (Rust function names), parameter names, and event names
- Window labels (`main` / `translation` / `settings` / `clipboard`) and `?window=` parameter values
- App identifier `com.ahmad-maqsood.skerry`, startup registry value `Skerry`, and Credential Manager service names `skerry.translation` / `skerry.plugins`
- Update endpoints and `latest.json` format

## General Development Conventions

- Every plugin in `plugins/<id>/` ships with its own user guide at `docs/plugins/<id>.md`. Add or update it in the same change as the plugin, following [User guide (required)](docs/plugins/README.md#user-guide-required).
- Prioritize reusing existing components, types, utility functions, and CSS classes.
- Persist frontend state using `localStorage`.
- When adding new Tauri commands, update the Rust handler, frontend typed wrapper, and capability permissions in tandem.
- When modifying window geometry or appearance, consider collapsed state, expanded state, and tucked state simultaneously.
- User-visible text is in English.

## Verification

| Change Scope | Must Run |
|---|---|
| Documentation only | Confirm Markdown readability |
| Frontend logic, styles, dependencies, or scripts | `pnpm check` + `pnpm build` |
| Rust, Tauri commands, windows, tray, registry, Windows API | `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm tauri build --no-bundle` |
| Release-related | Complete `pnpm tauri build` |
| Plugin crates or `plugin_host/` | `cargo test --manifest-path plugins/Cargo.toml --workspace` + the Rust row above |
