// Captures the README screenshots from the real, current Skerry UI in headless Chrome or Edge.
// Run it by hand, or from the manual "Screenshots" workflow in GitHub Actions; nothing else starts it.
//
//   pnpm screenshots                     every shot, into docs/assets/screenshots
//   pnpm screenshots music settings      only the shots whose scene or file name matches
//   pnpm screenshots --scale=2           pixel density (default 3, so a 700 px island is 2100 px wide)
//   pnpm screenshots --out=./out         another folder
//
// The production React components render over the fictional fixtures in
// tests/screenshots/demoData.ts (the OS-facing Tauri commands are mocked). Each page is drawn at
// a high device pixel ratio and cropped on whole pixels, so text and icon edges are crisp.
// Run it on Windows to get Segoe UI like the installed app; CHROME_PATH picks the browser.
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRegressionBrowser } from "./run-regression.mjs";

export const SHOTS = [
  { file: "screenshot-collapsed-clock.png", scene: "clock" },
  { file: "screenshot-collapsed-notification.png", scene: "notification" },
  { file: "screenshot-messages.png", scene: "messages" },
  { file: "screenshot-music.png", scene: "music" },
  { file: "screenshot-todos.png", scene: "todos" },
  { file: "screenshot-translation.png", scene: "translation" },
  { file: "screenshot-file-shelf.png", scene: "shelf" },
  { file: "screenshot-system.png", scene: "system" },
  { file: "screenshot-settings.png", scene: "settings" },
  { file: "screenshot-themes.png", scene: "themes" },
];

export const DEFAULT_SCALE = 3;
const VIEWPORT = { width: 1280, height: 800 };
const THEMES = [
  { material: "classic", label: "Classic" },
  { material: "liquidGlass", label: "Liquid Glass" },
  { material: "frostedGlass", label: "Frosted Glass" },
];
const SCENE_TIMEOUT_MS = 60_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

export function selectShots(shots, words) {
  if (!words.length) return shots;
  const selected = shots.filter((shot) => words.some((word) => shot.file.includes(word) || shot.scene === word));
  if (!selected.length) throw new Error(`No shot matches ${words.join(", ")}. Shots: ${shots.map((shot) => shot.scene).join(", ")}.`);
  return selected;
}

/** The pixel density from --scale (whole numbers from 1 to 4); sharp edges need a whole number. */
export function parseScale(value) {
  if (value === undefined) return DEFAULT_SCALE;
  const scale = Number(value);
  if (!Number.isInteger(scale) || scale < 1 || scale > 4) throw new Error(`--scale must be a whole number from 1 to 4, got "${value}".`);
  return scale;
}

/** Width and height in pixels, read from a PNG's header. */
export function pngSize(png) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** A crop on whole CSS pixels, so every edge lands on a device pixel and nothing is resampled. */
export function snapClip(box) {
  const x = Math.floor(box.x);
  const y = Math.floor(box.y);
  return { x, y, width: Math.ceil(box.x + box.width) - x, height: Math.ceil(box.y + box.height) - y };
}

const evaluate = async (session, expression, awaitPromise = false) =>
  (await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise })).result?.value;

async function setViewport(session, width, height, scale) {
  await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
}

async function waitForScene(session, scene) {
  const deadline = Date.now() + SCENE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = JSON.parse(await evaluate(session, `JSON.stringify({
      ready: document.documentElement.dataset.sceneReady ?? "",
      error: document.documentElement.dataset.sceneError ?? "",
      capture: document.documentElement.dataset.capture ?? "",
    })`) ?? "{}");
    if (state.error) throw new Error(`Scene "${scene}" failed:\n${state.error}`);
    if (state.ready === "true") return JSON.parse(state.capture);
    await sleep(250);
  }
  throw new Error(`Scene "${scene}" did not report ready within ${SCENE_TIMEOUT_MS / 1000}s.`);
}

async function shoot(session, shot, extra, scale) {
  await setViewport(session, VIEWPORT.width, VIEWPORT.height, scale);
  await session.send("Page.navigate", { url: "about:blank" });
  await session.send("Page.navigate", { url: extra.url });
  const clip = snapClip(await waitForScene(session, shot.scene));
  // Fonts and the last transitions settle before the pixels are taken.
  await evaluate(session, "document.fonts.ready.then(() => true)", true);
  await sleep(400);
  const { data } = await session.send("Page.captureScreenshot", { format: "png", clip: { ...clip, scale: 1 }, captureBeyondViewport: false });
  if (!data) throw new Error(`The browser returned no image for "${shot.scene}".`);
  return Buffer.from(data, "base64");
}

/** The three styles side by side on the desktop colour, each with its name below. */
async function composeThemes(session, parts, scale) {
  const gap = 24;
  const card = 420;
  const labelHeight = 42;
  const sizes = parts.map((part) => pngSize(part.png));
  const widest = Math.max(...sizes.map((size) => size.width));
  const cardHeight = Math.round(Math.max(...sizes.map((size) => size.height)) * (card / widest));
  const width = parts.length * card + (parts.length + 1) * gap;
  const height = cardHeight + labelHeight + 2 * gap;
  const cards = parts.map((part, index) => {
    const ratio = Math.min(card / sizes[index].width, cardHeight / sizes[index].height);
    const left = gap + index * (card + gap);
    return `<img src="data:image/png;base64,${part.png.toString("base64")}" style="position:absolute;left:${left}px;top:${gap}px;width:${sizes[index].width * ratio}px;height:${sizes[index].height * ratio}px">`
      + `<div style="position:absolute;left:${left}px;top:${gap + cardHeight + 8}px;font:600 14px 'Segoe UI Variable','Segoe UI',Inter,system-ui,sans-serif;color:#e2e8f0">${part.label}</div>`;
  }).join("");
  await setViewport(session, width, height, scale);
  await session.send("Page.navigate", { url: "about:blank" });
  await evaluate(session, `document.documentElement.style.background = "#0f172a";
    document.body.style.cssText = "margin:0";
    document.body.innerHTML = ${JSON.stringify(cards)};
    Promise.all([...document.images].map((image) => image.decode())).then(() => document.fonts.ready).then(() => true)`, true);
  await sleep(200);
  const { data } = await session.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
  return Buffer.from(data, "base64");
}

async function main() {
  const { options, words } = parseArgs(process.argv.slice(2));
  const scale = parseScale(options.scale);
  const out = path.resolve(root, options.out ?? "docs/assets/screenshots");
  const shots = selectShots(SHOTS, words);
  mkdirSync(out, { recursive: true });
  // The regression helper serves this checkout with Vite and drives a headless browser over the
  // DevTools protocol. Its first page only proves the server answers.
  await withRegressionBrowser(root, "island-tour.html", async ({ session, base }) => {
    for (const shot of shots) {
      const started = Date.now();
      const target = path.join(out, shot.file);
      const look = { wallpaper: "1" };
      let png;
      if (shot.scene === "themes") {
        const parts = [];
        for (const { material, label } of THEMES) {
          const messages = { scene: "messages" };
          parts.push({ label, png: await shoot(session, messages, { url: sceneUrl(base, messages, { ...look, material }) }, scale) });
        }
        png = await composeThemes(session, parts, scale);
      } else {
        png = await shoot(session, shot, { url: sceneUrl(base, shot, look) }, scale);
      }
      writeFileSync(target, png);
      const { width, height } = pngSize(png);
      console.log(`✓ ${shot.file}  ${width}×${height}px  ${Math.round(statSync(target).size / 1024)} KB  ${((Date.now() - started) / 1000).toFixed(1)}s`);
    }
  });
  console.log(`Captured ${shots.length} screenshot(s) at ${scale}x into ${path.relative(root, out) || "."}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0), (error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
