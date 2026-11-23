# Screenshot Capture Guide

This guide provides instructions and fictional demo data for capturing official screenshots for the Skerry documentation and repository README.

## Automated Capture

The screenshots are captured automatically; nobody has to arrange windows or retype demo data.

```powershell
pnpm install
pnpm screenshots                # all ten, into docs/assets/screenshots/
pnpm screenshots music settings # only the shots whose scene or file name matches
pnpm screenshots --scale=2      # sharper images (device scale factor; default 1 = 100% DPI)
pnpm screenshots --out=./out    # another folder
```

- **How it works**: `scripts/capture-screenshots.mjs` starts Vite and the same headless Chrome or Edge that the browser regression pages use, opens a scene of `tests/screenshots/scene.tsx` for each shot, and saves a cropped PNG. A scene is the real island, clipboard or settings window over mocked Windows APIs, driven (clicks, timers, incoming notification) into the state the shot needs.
- **Demo data** lives in `tests/screenshots/demoData.ts` and matches the shot list below. The clock is fixed at `10:42 AM`. The profile starts empty, so nothing from a developer's browser ever shows up.
- **CI**: the *Screenshots* workflow (`.github/workflows/screenshots.yml`) runs it on a Windows runner (so text is drawn in Segoe UI) when the UI changes on `main`, uploads the images as an artifact, and commits them if they changed. Run it by hand from the *Actions* tab and tick *commit* to refresh a branch.
- **Run it on Windows** for pictures that match what users see; on other systems the fonts differ.
- **Size**: the script prints each file's size and flags any over 250 KB. Shrink those with the command under *Capture and Compression Workflow*.
- **Changing a shot**: edit the demo data or the scene's steps, run `pnpm screenshots <name>`, and look at the result. Open `http://localhost:1420/tests/screenshots/scene.html?scene=music` under `pnpm dev` to see a scene live; `?material=liquidGlass`, `?theme=light` and `?wallpaper=1` work there too.

Where the automated shot differs from the list below:

- **Messages** shows the notifications the island's panel has room for; the rest scroll.
- **Todos** shows the task list with the running timer badge. The daily note is on the island's Notes view.
- **Settings** opens the Appearance page (`?page=<name>` picks another).

## Capture Guidelines

These apply to manual captures. The automated script follows them where it can.

- **Environment**: Windows 11 with 100% display scaling (DPI).
- **Background**: Clean, dark neutral wallpaper (e.g. solid `#0f172a` or subtle dark gradient) without desktop icons.
- **Window Position**: Center the island horizontally at the top of the screen.
- **Output Format**: PNG format, 24-bit color, saved directly to `docs/assets/screenshots/`.
- **Image Dimensions**: Recommended canvas width of 1280px (or 1920px for wide desktop captures).
- **Privacy Rule**: Never capture personal emails, real tokens, actual messages, or work projects. Use the fictional demo data provided below.

## Manual Capture and Compression Workflow

1. Use Windows Snipping Tool via `Win + Shift + S` (Window snip mode) or `Alt + PrtScn` to capture the targeted region.
2. Save raw captures into a temporary folder.
3. Optimize images to keep file sizes under 250 KB using `sharp-cli` or [Squoosh](https://squoosh.app):

```powershell
pnpm dlx sharp-cli -i input.png -o docs/assets/screenshots/screenshot-name.png --png-compression-level 9
```

---

## Shot List

### 1. Collapsed Idle Clock
- **File Name**: `screenshot-collapsed-clock.png`
- **Window / State**: Main window, collapsed state, idle (no active playback, alerts, or tasks).
- **What to Show**: Centered tabular digits clock (`10:42 AM`) with subtle glowing pill borders on a dark background.
- **Demo Data**: System time set to `10:42 AM`.

### 2. Collapsed Notification Preview
- **File Name**: `screenshot-collapsed-notification.png`
- **Window / State**: Main window, collapsed state during an incoming toast alert.
- **What to Show**: App icon, sender name, and one-line truncated preview text sliding into the collapsed pill.
- **Demo Data**:
  - App: Microsoft Outlook
  - Sender: `Liam Vance`
  - Preview text: `Q3 Engineering Roadmap Review - Final deck attached`

### 3. Expanded Messages Feed
- **File Name**: `screenshot-messages.png`
- **Window / State**: Main window, expanded state, Messages tab selected.
- **What to Show**: Universal feed cards grouped by source application, unread counter badge, and clear action button.
- **Demo Data**:
  - Card 1 (Teams): `Sophia Chen` - "Can you review the deployment checklist before 3 PM?"
  - Card 2 (WhatsApp): `Marcus Brody` - "Files received, compiling the test binary now."
  - Card 3 (Outlook): `Liam Vance` - "Q3 Engineering Roadmap Review - Final deck attached"
  - Card 4 (GitHub): `github-actions[bot]` - "Workflow CI passed on branch main"

### 4. Music Player with Synced Lyrics
- **File Name**: `screenshot-music.png`
- **Window / State**: Main window, expanded state, Music tab selected.
- **What to Show**: Album art cover, playback timeline progress bar, transport controls (play/pause, track skip), and live synced lyrics highlighting the current verse.
- **Demo Data**:
  - Track: `Midnight Horizon`
  - Artist: `Aether Echoes`
  - Album: `Neon Solitude (2026)`
  - Active lyric line: *"Tracing constellations through the frosted glass"*

### 5. Todos, Daily Notes, and Timer
- **File Name**: `screenshot-todos.png`
- **Window / State**: Main window, expanded state, Todos tab selected.
- **What to Show**: Task checklist with some completed items, an active countdown timer badge (`18:42 remaining`), and daily note excerpt.
- **Demo Data**:
  - Task 1 (checked): `Review PR #48 - updater migration`
  - Task 2 (unchecked): `Verify GitHub Actions release signing workflow`
  - Task 3 (unchecked): `Document plugin SDK API interface`
  - Daily Note: `Focusing on native Windows notification integration and performance checks.`

### 6. Clipboard History Window
- **File Name**: `screenshot-clipboard.png`
- **Window / State**: Independent Clipboard window (`?window=clipboard`), invoked via `Ctrl + Shift + W` (the default clipboard shortcut).
- **What to Show**: Search input box at the top, list of text entries, JSON code snippets, and favorited items marked with a star.
- **Demo Data**:
  - Entry 1 (Pinned): `https://github.com/ahmad-maqsood/skerry/releases`
  - Entry 2: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
  - Entry 3: `{"apiVersion": 1, "runtime": {"command": "skerry-bot.exe"}}`
  - Entry 4: `export const API_BASE_URL = "https://api.skerry.local/v1";`

### 7. File Shelf Staging Area
- **File Name**: `screenshot-file-shelf.png`
- **Window / State**: Main window, expanded state, File Shelf tab selected.
- **What to Show**: Staged file tiles with filetype icons, sizes, and drag indicator ready for drag-and-drop into target applications.
- **Demo Data**:
  - File 1: `skerry-architecture.pdf` (1.8 MB)
  - File 2: `app-icon-mark.svg` (24 KB)
  - File 3: `benchmark-results.csv` (142 KB)

### 8. Live System Monitor
- **File Name**: `screenshot-system.png`
- **Window / State**: Main window, expanded state, System tab selected.
- **What to Show**: Live CPU usage sparkline, RAM utilization breakdown, disk storage bars, and network speed meters.
- **Demo Data**:
  - CPU: `18% · 8 Cores` with 60-second usage history sparkline
  - Memory: `14.2 / 32.0 GB (44%)`
  - Disks: `C: (NVMe SSD) 412 / 953 GB`, `D: (Data) 1.2 / 2.0 TB`
  - Network: `Wi-Fi (5 GHz) · ↓ 4.2 MB/s · ↑ 620 KB/s`

### 9. Settings Window
- **File Name**: `screenshot-settings.png`
- **Window / State**: Standalone Settings window (`?window=settings`).
- **What to Show**: Clean sidebar navigation (General, Appearance, Todos, Music, Translation, Clipboard & files, Notifications, System, Plugins, About) with modern toggle switches and sliders.

### 10. Appearance Themes Collage
- **File Name**: `screenshot-themes.png`
- **Window / State**: Side-by-side or stacked collage comparing island styles.
- **What to Show**:
  - Classic (opaque dark / solid borders)
  - Liquid Glass (refractive glassmorphism blur)
  - Frosted Glass (translucent blurred backing)
