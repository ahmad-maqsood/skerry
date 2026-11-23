// Captures the documentation screenshots listed in docs/SCREENSHOTS.md, automatically.
//
//   pnpm screenshots                    every shot, into docs/assets/screenshots/
//   pnpm screenshots music settings     only the shots whose name contains a word
//   pnpm screenshots --out=./out        another folder
//   pnpm screenshots --scale=2          sharper images (device scale factor, default 1 = 100% DPI)
//
// Each shot is a scene of tests/screenshots/scene.tsx: the real island, clipboard or settings
// window over mocked Windows APIs and fictional demo data, in headless Chrome or Edge. It reuses
// the regression runner's Vite server and browser (scripts/run-regression.mjs), so it needs
// nothing beyond `pnpm install`. Run it on Windows (CI does) so the text is drawn in Segoe UI.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRegressionBrowser } from "./run-regression.mjs";

/** The shot list. `file` names match the README and docs/SCREENSHOTS.md. */
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
  // Three materials of the same page, side by side; see captureThemes.
  { file: "screenshot-themes.png", scene: "messages", themes: ["classic", "liquidGlass", "frostedGlass"] },
];

export const MAX_BYTES = 250 * 1024;
const VIEWPORT = { width: 1280, height: 800 };
const SCENE_TIMEOUT_MS = 30_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The shots a command line asks for: all of them, or those whose name contains a given word. */
export function selectShots(shots, words) {
  if (words.length === 0) return shots;
  const picked = shots.filter((shot) => words.some((word) => shot.file.includes(word) || shot.scene === word));
  if (picked.length === 0) throw new Error(`No shot matches ${words.join(", ")}. Shots: ${shots.map((shot) => shot.scene).join(", ")}.`);
  return picked;
}

/** "--name=value" arguments as an object, and the rest as plain words. */
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
  const query = new URLSearchParams({ scene: shot.scene, ...extra });
  return `${base}../screenshots/scene.html?${query}`;
}

async function evaluate(session, expression) {
  const { result, exceptionDetails } = await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result?.value;
}

/** Opens a scene and waits until it has put the UI into its state; returns where to crop. */
async function openScene(session, url, scale) {
  await session.send("Emulation.setDeviceMetricsOverride", { ...VIEWPORT, deviceScaleFactor: scale, mobile: false });
  await session.send("Page.navigate", { url });
  const deadline = Date.now() + SCENE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(250);
    const state = await evaluate(session, `JSON.stringify({ ready: document.documentElement.dataset.sceneReady ?? "", error: document.documentElement.dataset.sceneError ?? "", capture: document.documentElement.dataset.capture ?? "" })`).catch(() => "{}");
    const { ready, error, capture } = JSON.parse(state || "{}");
    if (error) throw new Error(`Scene failed: ${error}`);
    if (ready && capture) return JSON.parse(capture);
  }
  throw new Error(`Scene did not get ready within ${SCENE_TIMEOUT_MS / 1000}s: ${url}`);
}

async function screenshot(session, clip) {
  // Let the last animation frame finish and fonts settle before the picture is taken.
  await evaluate(session, "document.fonts.ready.then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))");
  const { data } = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: Math.floor(clip.x), y: Math.floor(clip.y), width: Math.ceil(clip.width), height: Math.ceil(clip.height), scale: 1 },
    captureBeyondViewport: false,
    fromSurface: true,
  });
  return Buffer.from(data, "base64");
}

/**
 * The themes picture: the same page in each material, captured one after the other and laid out
 * side by side on one page, which is then captured again. No image library is needed.
 */
async function captureThemes(session, base, shot, scale) {
  const parts = [];
  for (const material of shot.themes) {
    const clip = await openScene(session, sceneUrl(base, shot, { material, wallpaper: "1" }), scale);
    parts.push({ material, clip, png: (await screenshot(session, clip)).toString("base64") });
  }
  const gap = 24;
  // Shown at 65% so the collage stays near the 250 KB the shot list asks for.
  const shrink = 0.65;
  const width = Math.round(Math.max(...parts.map((part) => part.clip.width)) * shrink);
  const height = Math.round(Math.max(...parts.map((part) => part.clip.height)) * shrink) + 32;
  const total = { width: parts.length * width + (parts.length + 1) * gap, height: height + 2 * gap };
  await session.send("Emulation.setDeviceMetricsOverride", { width: total.width, height: total.height, deviceScaleFactor: scale, mobile: false });
  await session.send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  await evaluate(session, `(async () => {
    document.body.style.cssText = "margin:0;display:flex;gap:${gap}px;padding:${gap}px;align-items:flex-start;background:#0f172a";
    document.body.innerHTML = ${JSON.stringify(parts.map((part) => `<figure style="margin:0;font:600 13px 'Segoe UI',system-ui,sans-serif;color:#cbd5e1;text-align:center"><img style="display:block;width:${width}px;border-radius:14px" src="data:image/png;base64,${part.png}"><figcaption style="margin-top:10px">${{ classic: "Classic", liquidGlass: "Liquid Glass", frostedGlass: "Frosted Glass" }[part.material]}</figcaption></figure>`).join(""))};
    await Promise.all([...document.images].map((image) => image.decode()));
  })()`);
  const bounds = await evaluate(session, "JSON.stringify({ width: document.body.scrollWidth, height: document.body.scrollHeight })");
  return screenshot(session, { x: 0, y: 0, ...JSON.parse(bounds) });
}

export async function captureAll({ root, out, words = [], scale = 1 }) {
  const shots = selectShots(SHOTS, words);
  mkdirSync(out, { recursive: true });
  const written = [];
  await withRegressionBrowser(root, "island-tour.html", async ({ session, base }) => {
    for (const shot of shots) {
      const started = Date.now();
      const png = shot.themes
        ? await captureThemes(session, base, shot, scale)
        : await screenshot(session, await openScene(session, sceneUrl(base, shot), scale));
      const target = path.join(out, shot.file);
      writeFileSync(target, png);
      const kilobytes = Math.round(statSync(target).size / 1024);
      const note = statSync(target).size > MAX_BYTES ? `  (over ${MAX_BYTES / 1024} KB; optimize it, see docs/SCREENSHOTS.md)` : "";
      console.log(`✓ ${shot.file}  ${kilobytes} KB, ${((Date.now() - started) / 1000).toFixed(1)}s${note}`);
      written.push(target);
    }
  });
  return written;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { options, words } = parseArgs(process.argv.slice(2));
  const scale = Number(options.scale ?? 1);
  if (!(scale >= 1 && scale <= 4)) throw new Error(`--scale expects 1 to 4, got "${options.scale}".`);
  const out = path.resolve(root, options.out ?? "docs/assets/screenshots");
  const written = await captureAll({ root, out, words, scale });
  console.log(`Captured ${written.length} screenshot${written.length === 1 ? "" : "s"} into ${path.relative(root, out) || "."}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0), (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
