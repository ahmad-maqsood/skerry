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
pnpm screenshots --push
```

- With no words, every shot is captured into `docs/assets/screenshots/`. Words pick shots by scene or file name.
- `--scale` is the pixel density, a whole number from 1 to 4 (default **3**). At 3x a 700 px island becomes a 2100 px image, so the pictures stay sharp on high-DPI screens and when GitHub scales them down. A whole number keeps every edge on a device pixel.
- `--push` commits the new pictures into `docs/assets/screenshots/` (copying them there first if `--out` points elsewhere) and pushes the branch that is checked out; `--branch=<name>` names another branch to push to. Only the screenshot files are staged, nothing is committed when the pictures are identical to the ones already on the branch, and a branch that moved on since your checkout is rebased onto once before the push is retried. It never opens a pull request. HEAD must be on a branch (or pass `--branch`), and git must know who you are (`user.name` / `user.email`).
- `CHROME_PATH` picks the browser if Chrome or Edge is not in its usual place.
- Run it on **Windows** to get Segoe UI like the installed app. Another system uses its own fallback font, which can change line breaks slightly.

Every picture is **16:9**, the shape of the Microsoft Store gallery, and the README shows the same files. Each shot is a 16:9 area of the desktop around the island: centred on it, with room on both sides and tall enough to hold all of it. The island stays on the top edge, as it does on a real desktop. The themes picture puts the three tight crops side by side on the desktop colour, also 16:9.

The command starts this checkout's Vite server, opens each scene in a headless browser, waits for the scene to report that it is ready, and crops the picture on whole pixels. The desktop colour behind the island gives the glass materials something to blur. Only the screenshot scenes (`tests/screenshots/`) use mocked data; the app code is unchanged.

## Run it in GitHub Actions

The **Screenshots** workflow (`.github/workflows/screenshots.yml`) runs the same command on a Windows runner, so the pictures use Segoe UI like the installed app. It starts **only when you run it** from the Actions tab (Run workflow); it never runs on a push, a pull request or a schedule. Three optional inputs pick the shots (the same words as the command line, empty for all), the pixel density, and whether to commit the images (**commit**, on by default).

The images always come back as the `skerry-screenshots` artifact on the run page (kept for 14 days), even when the push below is refused. With **commit** on, the workflow also runs the command with `--push`: the new pictures are committed to `docs/assets/screenshots/` as `github-actions[bot]` (message `doc: update screenshots`) and pushed to the branch the run was started from, so the README shows them as soon as the run ends. No pull request is opened. A run started from a tag only makes the artifact, and a protected branch refuses the push: start the run from a feature branch, or switch **commit** off and copy the images in yourself.

## How the Tauri commands are mocked

`tests/screenshots/scene.tsx` uses `mockIPC()` and `mockWindows()` from `@tauri-apps/api/mocks` to answer the OS-facing commands (media, clipboard, notifications, volume, brightness, system metrics) with the fictional fixtures in `tests/screenshots/demoData.ts`. The island uses its default icon tabs, as in the installed app.

## Privacy and repeatability

- Every scene starts from a clean profile and uses fictional messages, names, tracks, clipboard entries, files, and system metrics.
- It reads nothing from the machine it runs on: no clipboard, notification center, media sessions, personal files, or installed apps.
- The clock and the scripted interactions are deterministic, so repeated runs give comparable images.

## Shot list

| Image | Scene | Contents |
|---|---|---|
| `screenshot-pixel-cat.png` | `cat` | Collapsed island with the pixel cat in place of the time |
| `screenshot-collapsed-clock.png` | `clock` | Collapsed island and idle clock |
| `screenshot-collapsed-notification.png` | `notification` | Incoming toast preview |
| `screenshot-messages.png` | `messages` | Expanded notification feed |
| `screenshot-music.png` | `music` | Media controls and synchronized demo lyrics |
| `screenshot-todos.png` | `todos` | Checklist and running focus timer |
| `screenshot-translation.png` | `translation` | Quick translation page on the island, with the keyless MyMemory service |
| `screenshot-file-shelf.png` | `shelf` | File staging shelf |
| `screenshot-system.png` | `system` | System monitor dashboard |
| `screenshot-settings.png` | `settings` | Settings and appearance controls |
| `screenshot-themes.png` | `themes` | Graphite, Liquid Glass, and Frosted Glass comparison |

To change a screenshot, edit the relevant scene in `tests/screenshots/scene.tsx` or its fictional fixtures in `tests/screenshots/demoData.ts`, then run `pnpm screenshots <scene>`. You can also open `/tests/screenshots/scene.html?scene=<name>&wallpaper=1` under `pnpm dev` to look at a scene by eye. The capture should not contain hand-drawn UI or placeholder images.
