# Screenshot Guide

Skerry's README screenshots come from the **real, current UI** (the production React components and styles), rendered in headless Chrome or Edge at a high pixel density. Nothing is drawn by hand and nothing is captured automatically: you run the command yourself when the UI has changed.

## Run the capture

On a machine with Chrome or Edge and the repository dependencies installed:

```powershell
pnpm install
pnpm screenshots
pnpm screenshots music settings
pnpm screenshots --scale=2
pnpm screenshots --out=./out
```

- With no words, every shot is captured into `docs/assets/screenshots/`. Words pick shots by scene or file name.
- `--scale` is the pixel density, a whole number from 1 to 4 (default **3**). At 3x a 700 px island becomes a 2100 px image, so the pictures stay sharp on high-DPI screens and when GitHub scales them down. A whole number keeps every edge on a device pixel.
- `CHROME_PATH` picks the browser if Chrome or Edge is not in its usual place.
- Run it on **Windows** to get Segoe UI like the installed app. Another system uses its own fallback font, which can change line breaks slightly.

The command starts this checkout's Vite server, opens each scene in a headless browser, waits for the scene to report that it is ready, and crops the picture on whole pixels. The desktop colour behind the island gives the glass materials something to blur. Only the screenshot scenes (`tests/screenshots/`) use mocked data; the app code is unchanged.

There is no CI workflow for screenshots: they are never refreshed on a schedule or on a push. Commit the new images yourself.

## How the Tauri commands are mocked

`tests/screenshots/scene.tsx` uses `mockIPC()` and `mockWindows()` from `@tauri-apps/api/mocks` to answer the OS-facing commands (media, clipboard, notifications, volume, brightness, system metrics) with the fictional fixtures in `tests/screenshots/demoData.ts`. The island uses its default icon tabs, as in the installed app.

## Privacy and repeatability

- Every scene starts from a clean profile and uses fictional messages, names, tracks, clipboard entries, files, and system metrics.
- It reads nothing from the machine it runs on: no clipboard, notification center, media sessions, personal files, or installed apps.
- The clock and the scripted interactions are deterministic, so repeated runs give comparable images.

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

To change a screenshot, edit the relevant scene in `tests/screenshots/scene.tsx` or its fictional fixtures in `tests/screenshots/demoData.ts`, then run `pnpm screenshots <scene>`. You can also open `/tests/screenshots/scene.html?scene=<name>&wallpaper=1` under `pnpm dev` to look at a scene by eye. The capture should not contain hand-drawn UI or placeholder images.
