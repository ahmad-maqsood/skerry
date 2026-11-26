# Screenshot Guide

Skerry's README screenshots come from the **real, current UI** (the production React components and styles), rendered in headless Chrome or Edge at a high pixel density. Nothing is drawn by hand and nothing is captured automatically: you run the command yourself (or start the manual workflow) when the UI has changed.

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

Every picture is put on one **2560×1440 (16:9)** canvas by `scripts/frame-screenshots.mjs`: the capture keeps its own pixels and the space around it is a blurred, darkened copy of the same picture. The Microsoft Store gallery shows 16:9 pictures, so a wide strip or a tall window would otherwise be cropped there. To frame pictures captured without it, run `node scripts/frame-screenshots.mjs --from=<folder>`; it reads the unframed PNGs from the folder and writes the framed ones over `docs/assets/screenshots/` (or `--out=<folder>`).

The command starts this checkout's Vite server, opens each scene in a headless browser, waits for the scene to report that it is ready, and crops the picture on whole pixels. The desktop colour behind the island gives the glass materials something to blur. Only the screenshot scenes (`tests/screenshots/`) use mocked data; the app code is unchanged.

## Run it in GitHub Actions

The **Screenshots** workflow (`.github/workflows/screenshots.yml`) runs the same command on a Windows runner, so the pictures use Segoe UI like the installed app. It starts **only when you run it** from the Actions tab (Run workflow); it never runs on a push, a pull request or a schedule. Two optional inputs pick the shots (the same words as the command line, empty for all) and the pixel density.

The images come back as the `skerry-screenshots` artifact on the run page (kept for 14 days). Nothing is committed: download them, copy the ones you want into `docs/assets/screenshots/`, and commit them yourself.

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
| `screenshot-translation.png` | `translation` | Quick translation page on the island, with the keyless MyMemory service |
| `screenshot-file-shelf.png` | `shelf` | File staging shelf |
| `screenshot-system.png` | `system` | System monitor dashboard |
| `screenshot-settings.png` | `settings` | Settings and appearance controls |
| `screenshot-themes.png` | `themes` | Classic, Liquid Glass, and Frosted Glass comparison |

To change a screenshot, edit the relevant scene in `tests/screenshots/scene.tsx` or its fictional fixtures in `tests/screenshots/demoData.ts`, then run `pnpm screenshots <scene>`. You can also open `/tests/screenshots/scene.html?scene=<name>&wallpaper=1` under `pnpm dev` to look at a scene by eye. The capture should not contain hand-drawn UI or placeholder images.
