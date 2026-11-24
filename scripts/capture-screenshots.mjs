// Captures the actual Skerry Tauri desktop window on Windows.
// The React screens are the production components; only OS-facing commands and user data are
// replaced by the fictional fixtures in tests/screenshots/demoData.ts.
//
//   pnpm screenshots
//   pnpm screenshots music settings
//   pnpm screenshots --out=./out
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
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
  if (!selected.length) throw new Error(`No shot matches ${words.join(", ")}. Shots: ${shots.map((shot) => shot.scene).join(", ")}.`);
  return selected;
}

function runPowerShell(args) {
  const result = spawnSync(powershell, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", ...args], {
    cwd: root, encoding: "utf8", timeout: 720_000, maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `PowerShell exited with ${result.status}.`);
  return result.stdout;
}

function createSceneSignalServer(token) {
  let resolveSignal;
  let rejectSignal;
  const signal = new Promise((resolve, reject) => {
    resolveSignal = resolve;
    rejectSignal = reject;
  });
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Private-Network", "true");
    response.writeHead(204);
    response.end();
    // A browser may send an OPTIONS preflight for loopback access. Only the actual GET
    // from the scene page is allowed to release the capture wait.
    if (request.method !== "GET" || url.pathname !== "/scene-signal" || url.searchParams.get("token") !== token) return;
    if (url.searchParams.get("status") === "ready") resolveSignal();
    if (url.searchParams.get("status") === "error") {
      rejectSignal(new Error(`Screenshot scene failed to render: ${url.searchParams.get("message") ?? "Unknown scene error"}`));
    }
  });
  const listening = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    async start() {
      await listening;
      return server.address().port;
    },
    async wait(timeoutMs = 10 * 60_000) {
      let timer;
      try {
        await Promise.race([
          signal,
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Screenshot scene did not report ready within ${timeoutMs / 60_000} minutes. The native app may still be compiling/starting, or the WebView may have failed to load tests/screenshots/scene.html.`)), timeoutMs);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    close() {
      server.close();
    },
  };
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
  const captureToken = randomUUID();
  const signalServer = createSceneSignalServer(captureToken);
  const capturePort = await signalServer.start();
  query.set("capturePort", String(capturePort));
  query.set("captureToken", captureToken);
  // The native window opens native-host.html, which embeds the maintained scene page in an iframe
  // (not the stale root-level screenshot.html). WebView2 makes window.__TAURI_INTERNALS__
  // read-only and non-configurable in every frame, so the scene cannot mock it. With
  // SKERRY_NATIVE_SCREENSHOTS=1 (set below) vite.config.ts points the @tauri-apps packages at
  // private globals instead, which mockIPC()/mockWindows() can fill freely.
  const url = `tests/screenshots/native-host.html?${query}`;
  const overlay = {
    app: { windows: [{ label: "main", title: "Skerry", url, width: 1280, height: 800, center: true, visible: true, alwaysOnTop: true }] },
  };
  await import("node:fs/promises").then(({ writeFile }) => writeFile(config, JSON.stringify(overlay)));

  // Tauri dev launches the real Windows desktop window and its WebView2 runtime. The screenshot
  // harness mounts the same production React components inside that native window (not Chrome).
  // Use PowerShell as the Windows command host rather than cmd.exe. cmd /s /c was
  // forwarding the quotes around this path as part of the --config value, so Tauri tried
  // to open a filename that literally contained quotation marks (Windows error 123).
  const command = process.platform === "win32" ? powershell : "pnpm";
  const quotedConfig = config.replace(/'/g, "''");
  const args = process.platform === "win32"
    ? [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
      "-Command", `& pnpm tauri dev --config '${quotedConfig}'`,
    ]
    : ["tauri", "dev", "--config", config];
  // Keep Tauri/Cargo output in the Actions log so native startup failures are visible.
  // The environment reaches Tauri's beforeDevCommand, i.e. the Vite dev server that serves the scene.
  const app = spawn(command, args, {
    cwd: root, stdio: "inherit", windowsHide: true,
    env: { ...process.env, SKERRY_NATIVE_SCREENSHOTS: "1" },
  });
  let launchError;
  app.once("error", (error) => { launchError = error; });
  try {
    await sleep(1_500);
    if (launchError) throw new Error(`Could not start the Tauri launcher: ${launchError.message}`);
    if (app.exitCode !== null) {
      throw new Error(`Tauri launcher exited before the window appeared (exit code ${app.exitCode}) while capturing ${scene}.`);
    }

    // Do not capture a native window just because it exists. Wait until the screenshot page has
    // mounted the requested React scene and completed its scripted interactions.
    await signalServer.wait();
    console.log(`✓ Scene "${sceneName}" rendered and reported ready.`);

    const captureScript = path.join(root, "scripts", "capture-window.ps1");
    runPowerShell([
      "-File", captureScript,
      "-WindowTitle", "Skerry",
      "-OutputPath", output,
      "-ReadyDelaySeconds", "2",
      "-TimeoutSeconds", "60",
      "-LauncherProcessId", String(app.pid),
    ]);
  } finally {
    signalServer.close();
    if (app.pid && app.exitCode === null) {
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"], { stdio: "ignore" });
      else app.kill("SIGTERM");
    }
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
      // Pass each theme image as its own named parameter. This avoids PowerShell
      // array/JSON argument binding differences when launched from Node on Windows.
      runPowerShell([
        "-File", path.join(root, "scripts", "compose-screenshot-themes.ps1"),
        "-ClassicPath", themeParts[0],
        "-LiquidGlassPath", themeParts[1],
        "-FrostedGlassPath", themeParts[2],
        "-OutputPath", target,
      ]);
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
