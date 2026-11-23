// Captures the actual Skerry Tauri desktop window on Windows.
// The React screens are the production components; only OS-facing commands and user data are
// replaced by the fictional fixtures in tests/screenshots/demoData.ts.
//
//   pnpm screenshots
//   pnpm screenshots music settings
//   pnpm screenshots --out=./out
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHOTS = [
  { file: "screenshot-collapsed-clock.png", scene: "clock" },
  { file: "screenshot-collapsed-notification.png", scene: "notification" },
  { file: "screenshot-messages.png", scene: "messages" },
  { file: "screenshot-music.png", scene: "music" },
  { file: "screenshot-todos.png", scene: "todos" },
  { file: "screenshot-clipboard.png", scene: "clipboard" },
  { file: "screenshot-file-shelf.png", scene: "shelf" },
  { file: "screenshot-system.png", scene: "system" },
  { file: "screenshot-settings.png", scene: "settings" },
  { file: "screenshot-themes.png", scene: "themes" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function parseArgs(argv) {
  const options = {};
  const words = [];
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(arg);
    if (match) options[match[1]] = match[2];
    else if (!arg.startsWith("--")) words.push(arg);
  }
  return { options, words };
}

export function sceneUrl(base, shot, extra = {}) {
  const url = new URL("../screenshots/scene.html", base);
  url.search = new URLSearchParams({ scene: shot.scene, ...extra }).toString();
  return url.toString();
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const powershell = process.env.POWERSHELL_PATH ?? "powershell.exe";

export function selectShots(shots, words) {
  if (!words.length) return shots;
  const selected = shots.filter((shot) => words.some((word) => shot.file.includes(word) || shot.scene === word));
  if (!selected.length) throw new Error(`No screenshot matches: ${words.join(", ")}.`);
  return selected;
}

function runPowerShell(args) {
  const result = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", ...args], {
    cwd: root, encoding: "utf8", timeout: 300_000, maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `PowerShell exited with ${result.status}.`);
  return result.stdout;
}

async function captureScene(scene, output) {
  const temp = mkdtempSync(path.join(os.tmpdir(), "skerry-native-shot-"));
  const config = path.join(temp, "tauri.screenshot.json");
  const [sceneName, ...extraParts] = scene.split("&");
  const query = new URLSearchParams({ scene: sceneName });
  for (const part of extraParts) {
    const [key, value = ""] = part.split("=");
    query.set(key, value);
  }
  const url = `screenshot.html?${query}`;
  const overlay = {
    app: { windows: [{ label: "main", title: "Skerry", url, width: 1280, height: 800, center: true, visible: true, alwaysOnTop: true }] },
  };
  await import("node:fs/promises").then(({ writeFile }) => writeFile(config, JSON.stringify(overlay)));

  // Tauri dev launches the real Windows desktop window and its WebView2 runtime. The screenshot
  // harness mounts the same production React components inside that native window (not Chrome).
  const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `pnpm tauri dev --config "${config}"`]
    : ["tauri", "dev", "--config", config];
  const app = spawn(command, args, { cwd: root, stdio: "ignore", windowsHide: true });
  try {
    await sleep(1_500);
    const captureScript = path.join(root, "scripts", "capture-window.ps1");
    runPowerShell(["-File", captureScript, "-WindowTitle", "Skerry", "-OutputPath", output, "-ReadyDelaySeconds", "10"]);
    if (app.exitCode !== null && app.exitCode !== 0) throw new Error(`Tauri exited with code ${app.exitCode} while capturing ${scene}.`);
  } finally {
    if (app.pid && process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"], { stdio: "ignore" });
    else app.kill("SIGTERM");
    await sleep(700);
    rmSync(temp, { recursive: true, force: true });
  }
}

async function main() {
  if (process.platform !== "win32") throw new Error("Native Skerry screenshots must run on Windows (GitHub Actions uses windows-latest).");
  const argv = process.argv.slice(2);
  const outArg = argv.find((arg) => arg.startsWith("--out="));
  const words = argv.filter((arg) => !arg.startsWith("--"));
  const out = path.resolve(root, outArg?.slice("--out=".length) ?? "docs/assets/screenshots");
  mkdirSync(out, { recursive: true });
  const shots = selectShots(SHOTS, words);
  const themeParts = [];
  for (const shot of shots) {
    const target = path.join(out, shot.file);
    const started = Date.now();
    if (shot.scene === "themes") {
      for (const material of ["classic", "liquidGlass", "frostedGlass"]) {
        const part = path.join(os.tmpdir(), `skerry-theme-${material}.png`);
        await captureScene(`messages&material=${material}`, part);
        themeParts.push(part);
      }
      runPowerShell(["-File", path.join(root, "scripts", "compose-screenshot-themes.ps1"), "-Inputs", ...themeParts, "-OutputPath", target]);
    } else {
      await captureScene(shot.scene, target);
    }
    const size = Math.round(statSync(target).size / 1024);
    console.log(`✓ ${shot.file}  ${size} KB  ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  for (const part of themeParts) rmSync(part, { force: true });
  console.log(`Captured ${shots.length} screenshot(s) from the native Skerry window into ${path.relative(root, out)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
