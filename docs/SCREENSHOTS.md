# Native Screenshot Capture Guide

Skerry's README screenshots are captured from the **real Windows desktop application window**, not from a browser mockup or a separately recreated design.

## Run the capture

Run on Windows with the repository dependencies installed:

```powershell
pnpm install
pnpm screenshots
pnpm screenshots music settings
pnpm screenshots --out=./out
```

The command launches the Tauri desktop app for each scene, waits for its native window to render, captures that window using Windows screen capture, then closes it before moving to the next scene. It uses the production React components and styling inside WebView2. Only OS-facing Tauri commands and user data are replaced by the fictional fixtures in `tests/screenshots/demoData.ts`.

## How the Tauri commands are mocked

WebView2 makes `window.__TAURI_INTERNALS__` read-only and non-configurable in every frame, so a scene cannot replace it. While `pnpm screenshots` runs, it sets `SKERRY_NATIVE_SCREENSHOTS=1`; `vite.config.ts` then makes the `@tauri-apps` packages read private globals (`__SKERRY_SCREENSHOT_INTERNALS__`), which `mockIPC()`/`mockWindows()` from `@tauri-apps/api/mocks` fill as usual. The real Tauri IPC is never used for a scene, and normal `pnpm dev`/`pnpm build` are unaffected.

## GitHub Actions

The **Refresh native app screenshots** workflow runs on Windows when relevant UI or capture files change on `main`, and can also be started manually from Actions. It uploads the generated images as a 30-day artifact and opens or updates a pull request containing the refreshed images. It never pushes generated screenshots directly to `main`.

## Privacy and repeatability

- The capture harness starts with a clean app profile and uses fictional messages, names, tracks, clipboard entries, files, and system metrics.
- It does not read the runner's clipboard, notification center, media sessions, personal files, or installed apps.
- The clock and screenshot state are deterministic so repeated runs produce comparable images.
- Screenshots are taken from the native Tauri window on Windows, using the same WebView2 rendering path as the installed app.

## Shot list

| Image | Scene | Contents |
|---|---|---|
| `screenshot-collapsed-clock.png` | `clock` | Collapsed island and idle clock |
| `screenshot-collapsed-notification.png` | `notification` | Incoming toast preview |
| `screenshot-messages.png` | `messages` | Expanded notification feed |
| `screenshot-music.png` | `music` | Media controls and synchronized demo lyrics |
| `screenshot-todos.png` | `todos` | Checklist and running focus timer |
| `screenshot-clipboard.png` | `clipboard` | Standalone clipboard history window |
| `screenshot-file-shelf.png` | `shelf` | File staging shelf |
| `screenshot-system.png` | `system` | System monitor dashboard |
| `screenshot-settings.png` | `settings` | Settings and appearance controls |
| `screenshot-themes.png` | `themes` | Classic, Liquid Glass, and Frosted Glass comparison |

To change a screenshot, edit the relevant scene in `tests/screenshots/scene.tsx` or its fictional fixtures in `tests/screenshots/demoData.ts`, then run the matching scene locally. The capture process itself should not contain hand-drawn UI or generated placeholder screenshots.
