# Plugin Development Guide

> **Plugins are not switched on in releases yet.** The plugin host (Plugin API v1, see [section 7](#7-plugin-api-v1-executable-plugins)) is part of the code, but the root `release-features.json` has `"plugins": false`, so Settings -> Plugins shows the roadmap instead of the install page. You can already develop a plugin following this guide and open a PR.

---

## 1. What Is a Plugin?

**In short: A plugin is a feature built from the island's source code that becomes part of the island itself once installed.**

Plugins can take two forms:

1. **Transform an existing feature.** For example, the island's daily notes currently only supports plain text. If someone creates a "Markdown notes" plugin, once installed, **the original note** can support bold, italics, and multi-level headings. No second note window is added to the island; users continue writing in the original place, but the note itself becomes more powerful.
2. **Build a brand-new feature.** For example, adding a "Pomodoro statistics" page to the island, a new message source, or a set of new quick actions. It is something the island did not have originally, but it is built to feel like a native island feature: placed in an appropriate position (a new page on the island, a state when collapsed, or a group of options in settings), using the island's styles and interaction habits.

Both are welcome. Where the feature lives is also up to you: it can be placed on the island (a new page, a collapsed state), or **opened in an independent window**, just like the island's clipboard and translation windows. The key is that it looks and feels like part of the island. A plugin is **NOT**:

- An unrelated app that merely launches from the island, with an entirely different UI style and interaction habits;
- A piece of code running parallel to the island: even if shoehorned in, its styling and interactions clash with the island.

A plugin **IS**:

- Built on the island's **complete source code**, able to reuse existing components, styles, data, and native capabilities, as well as adding new ones as needed;
- Indistinguishable from native features once installed: looks and behaves as if the island had it from the start;
- **Not installed by default**: users download on demand in "Settings -> Plugins". For users who do not install it, the island remains completely identical to before.

## 2. Complete Workflow

```text
Fork repository -> Modify island source locally -> Self-test and record demo on real island -> Open PR using template
        -> Maintainer reviews -> Adapts (makes it optionally installable) -> Ships with release, users download on demand
```

Because a plugin modifies the island itself, **it cannot be merged and released directly**: maintainers will adapt your changes during merge into an "optional install" form, ensuring users without the plugin are unaffected. Therefore, you only need to focus on making the feature great and communicating the demo and details clearly.

## 3. How to Develop

### 1. Prepare Environment

1. Fork [skerry](https://github.com/ahmad-maqsood/skerry) and clone it locally.
2. Install Node.js, pnpm, Rust (version pinned in `rust-toolchain.toml`), and Tauri 2 Windows dependencies (WebView2, MSVC build tools).
3. Run in the repository root:

   ```powershell
   pnpm install
   pnpm tauri dev
   ```

   Once the island starts up, you can begin modifying.

### 2. Read These Documents First

| Document | Why read it |
| --- | --- |
| [AGENTS.md](../../AGENTS.md) | Repository rules: directory layout, file line limits, immutable contracts, verification commands |
| [src/AGENTS.md](../../src/AGENTS.md) | Frontend rules: layering, English UI strings, styles and components |
| [src-tauri/AGENTS.md](../../src-tauri/AGENTS.md) | If modifying Rust / Windows native parts |
| [DESIGN.md](../../DESIGN.md) and `docs/design/` | Island UI guidelines: color palette, radii, spacing, animations; plugins must comply |
| [contracts.md](../architecture/contracts.md) | The `localStorage` keys, commands, events and file formats that must stay compatible |

### 3. Requirements When Modifying

- **When enhancing an existing feature, modify it in place.** To enhance notes, modify notes under `src/features/todos/`; to enhance clipboard, modify `src/features/clipboard/`. Do not build a parallel copy.
- **When creating a new feature, follow the island's structure.** Place new domains under `src/features/<feature>/`, and hook new island pages or settings groups into existing pages and settings structures (refer to existing features). Either way, reuse existing components and styles rather than creating a second design system.
- **When an independent window is needed, model it after existing windows.** Refer to the clipboard window (`?window=clipboard`): use a new window label and `?window=` parameter, create on demand, and use island styles; do not modify existing four window labels.
- **Keep changes contained and toggleable.** Keep newly added logic in independent files or directories as much as possible, leaving only minimal hook points in original features, and clearly document "which locations are hook points" in the PR. This allows maintainers to adapt it into an optional install, where zero lines take effect when not installed.
- **Do not break users without the plugin.** Saved data (`skerry-*` in `localStorage`, files in app data directory), Tauri command names, and window labels must not change; use new keys if saving new data, while maintaining backward compatibility for reading old data. See [contracts.md](../architecture/contracts.md) for full list.
- **Look like part of the island.** Use the island's existing color variables and components. Check dark / light modes and liquid glass / frosted glass materials; text and buttons must not overflow in narrow windows.
- **English-first.** All user-visible strings (including button tooltips and screen reader labels) must be in English.
- **Security and privacy.** No covert networking, no data collection, no reading files unrelated to the feature; if networking or file reading is required, state clearly in the PR which domains are contacted, which paths are read/written, and why. Never commit credentials, secrets, or personal data.
- **Performance.** The island runs persistently in the background. Do not add high-frequency polling or persistent heavy computation; expansion and collapse must not lag.

### 4. Self-Testing Before Submission

Run in repository root and ensure all pass before submitting:

```powershell
pnpm check
pnpm build
pnpm test:regression
```

If Rust code was modified, also run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
```

Then fully test the feature in the real island (`pnpm tauri dev`), **recording your screen while testing**.

## 4. What Is Required in the PR

Open a pull request and put the following items in its description. They **must be filled out**; omissions will not be reviewed:

| Required Item | Description |
| --- | --- |
| **Demo Recording Link** | Screen recording of the plugin in actual use on the real island (public links such as Bilibili, YouTube, cloud drives). Must show: state before change, how to use after change, and key features demonstrated one by one. Screenshots or standalone app demos cannot substitute. Mask private messages and account information in the recording. |
| **Plugin Details** | Display name and identifier. |
| **Contact Info** | A public channel where you can be reached (email, etc.) if review issues arise. |
| **GitHub Link** | Your GitHub profile, and repository/branch where plugin code resides. |
| **Plugin Summary** | Name, one-sentence introduction, which island feature is modified, and what changes for users after installing. Used in plugin list; write clearly for regular users. |
| **Change Description** | Which files were modified; which locations are hook points into original features; whether new storage, commands, networking, or file reading/writing were added. |
| **Self-Test Results** | Results of the verification commands above, plus manual testing scenarios (dark/light, both glass materials, narrow windows, long strings, long content, empty content). |

Optional: screenshots, known issues, future roadmap.

## 5. Review and Release

1. **Maintainer Review**: checks whether feature is worthwhile, blends seamlessly with island, and has no security or performance issues. You may be asked to make adjustments.
2. **Maintainer Adaptation**: organizes changes into an "optional install" plugin format. Handled entirely by maintainers; you do not need to implement the installation mechanism.
3. **Release with Version**: plugin is uninstalled by default, appearing in "Settings -> Plugins" list with your name, summary, and demo for users to download on demand.
4. Submission does not guarantee merging or immediate release; maintainers will provide reasons in the PR.

## 6. Frequently Asked Questions

**Q: Can I build a brand-new feature instead of modifying an existing one?**
Of course, that is also a type of plugin. As long as it is placed appropriately like native island features (a new page on the island, a collapsed state, a settings group) and follows the same design guidelines. For larger new features, opening an Issue to discuss direction beforehand is recommended.

**Q: Can a plugin open its own separate window?**
Yes. Independent windows like clipboard or translation are completely supported, following existing window patterns (new window label, create on demand). UI in the window must use the island's own components and styles rather than a separate aesthetic.

**Q: Do I need to implement "download / install plugin" myself?**
No. You only need to build the feature; optional-install adaptation is completed by maintainers.

## 7. Plugin API v1 (executable plugins)

Besides source-level contributions (sections 1-6), the app ships a plugin host that runs a separate executable and shows what it publishes in native island components. The three example plugins in this repository (`plugins/gemini`, `plugins/grok-bot`, `plugins/hermes`) use it. The host lives in `src-tauri/src/plugin_host/`, the frontend in `src/features/plugins/`, and the commands and events are listed in [contracts.md](../architecture/contracts.md#plugin-api-v1).

### Layout

Each plugin is its own crate in `plugins/<id>/` (`Cargo.toml`, `skerry-plugin.json`, `src/main.rs`). The crates are members of the separate workspace `plugins/Cargo.toml` together with `plugins/sdk`, which provides the stdio runtime and helpers (`run`, `publish`, `quota`, `session`, `notification`, credential access). They are not part of the main `src-tauri` workspace, and the main app must not take network, database or client dependencies for them.

### Manifest (`skerry-plugin.json`)

The manifest is at most 64 KiB and unknown fields are rejected.

| Field | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, `-` and `.`; starts with a letter; at most 100 characters; no reserved Windows device names |
| `name`, `description` | `{ "en": "...", "zh-CN": "..." }`; `en` is required, `zh-CN` is optional |
| `version` | Semantic version |
| `apiVersion` | `1` |
| `runtime.command` | A relative path to an `.exe` inside the package |
| `permissions` | Any of `network`, `read-home-files`, `notifications`, `quota`, `sessions`, `desktop-windows`, `private-browser` |
| `contributes` | Any of `quota`, `sessions`, `notifications`; each one must also be listed in `permissions` |
| `settings` (optional) | `{ key, label, type, default, options? }` with `type` one of `toggle`, `text`, `secret` or `select`; a `secret` default must be empty |
| `actions` (optional) | `{ id, label }` entries the user can trigger |

### Protocol

JSON-RPC 2.0, one JSON object per line over the plugin's stdin and stdout (only JSON-RPC may be written to stdout). A line is at most 256 KiB.

1. The host sends `initialize` with `{ apiVersion: 1, settings }` and waits up to 10 seconds. A plugin must not publish before it has answered.
2. The plugin sends `publish` notifications (no `id`) with `{ quota, sessions, notifications }`. At most 32 quota items, 200 sessions and 100 notifications; each kind must be declared in `contributes`; ids are unique; strings are at most 4096 characters; percentages are 0-100; a session `status` is `running`, `waiting` or `completed`.
3. The host sends `action` with `{ id }` when the user triggers a manifest action; the plugin has 15 seconds to answer.
4. On stop the host sends a `shutdown` notification and waits about 3 seconds before ending the process. A plugin that exits is restarted with backoff (1, 2, 4, 8, 16, then 32 seconds) and then left stopped.

### Storage, secrets and distribution

- `plugins-state.json` in the app data directory records the installed plugins, their enabled state, non-secret settings, developer mode and the index URL; packages live in `plugins/<id>/` and bounded stderr in `plugin-logs/<id>.log`.
- `secret` settings are stored in Windows Credential Manager (service `skerry.plugins`, account `<id>/<key>`) and are only handed to the plugin over stdin, never returned to the frontend or written to logs.
- Plugins are published through `plugins-index.json` (at most 200 entries, each with `id`, `version`, `name`, `description`, `apiVersion`, `url`, `sha256`, `size` and `minAppVersion`). Packages must be HTTPS downloads of at most 100 MiB whose SHA-256 matches the index; entries that need a newer app are hidden.
- With developer mode on (Settings -> Plugins -> Developer) you can point the app at a local index or load an unpacked plugin directory; the app never deletes a development directory on uninstall.

