// Puts each README screenshot on one 16:9 canvas, so the pictures fit the Microsoft Store's
// screenshot gallery and the README alike. A tight crop (a 4:1 strip, a tall window) keeps its
// pixels; the space around it is a blurred, darkened copy of the same picture.
//
//   node scripts/frame-screenshots.mjs                 frame every PNG in docs/assets/screenshots in place
//   node scripts/frame-screenshots.mjs --from=./raw    read the unframed PNGs from another folder
//   node scripts/frame-screenshots.mjs --out=./framed  write somewhere else
//
// `pnpm screenshots` calls frameScreenshot itself, so its output is already framed.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRegressionBrowser } from "./run-regression.mjs";

/** The Store takes 16:9 pictures from 1366×768 up to 3840×2160. */
export const FRAME = { width: 2560, height: 1440 };
/** The room the picture itself may fill, and how far a small picture may be enlarged before it turns soft. */
const BOX = { width: 2240, height: 1260 };
const MAX_ENLARGE = 1.5;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Width and height in pixels, read from a PNG's header. */
const sizeOf = (png) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

/** Where the picture sits on the canvas: as large as fits the box, centred, enlarged at most MAX_ENLARGE times. */
export function framePlacement(size) {
  const ratio = Math.min(BOX.width / size.width, BOX.height / size.height, MAX_ENLARGE);
  const width = Math.round(size.width * ratio);
  const height = Math.round(size.height * ratio);
  return { width, height, left: Math.round((FRAME.width - width) / 2), top: Math.round((FRAME.height - height) / 2) };
}

export async function frameScreenshot(session, png) {
  const place = framePlacement(sizeOf(png));
  const src = `data:image/png;base64,${png.toString("base64")}`;
  await session.send("Emulation.setDeviceMetricsOverride", { width: FRAME.width, height: FRAME.height, deviceScaleFactor: 1, mobile: false });
  await session.send("Page.navigate", { url: "about:blank" });
  await session.send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `document.documentElement.style.background = "#0b1020";
      document.body.style.cssText = "margin:0;overflow:hidden";
      document.body.innerHTML = ${JSON.stringify(`
        <img src="${src}" style="position:absolute;inset:-160px;width:${FRAME.width + 320}px;height:${FRAME.height + 320}px;object-fit:cover;filter:blur(70px) brightness(.62) saturate(1.1)">
        <img src="${src}" style="position:absolute;left:${place.left}px;top:${place.top}px;width:${place.width}px;height:${place.height}px;border-radius:28px;box-shadow:0 30px 90px rgba(0,0,0,.55);image-rendering:auto">`)};
      Promise.all([...document.images].map((image) => image.decode())).then(() => true)`,
  });
  const { data } = await session.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, ...FRAME, scale: 1 } });
  if (!data) throw new Error("The browser returned no image for the frame.");
  return Buffer.from(data, "base64");
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => /^--([a-z-]+)=(.*)$/.exec(arg)).filter(Boolean).map((m) => [m[1], m[2]]));
  const from = path.resolve(root, args.from ?? "docs/assets/screenshots");
  const out = path.resolve(root, args.out ?? "docs/assets/screenshots");
  mkdirSync(out, { recursive: true });
  const files = readdirSync(from).filter((file) => /^screenshot-.*\.png$/.test(file));
  await withRegressionBrowser(root, "island-tour.html", async ({ session }) => {
    for (const file of files) {
      writeFileSync(path.join(out, file), await frameScreenshot(session, readFileSync(path.join(from, file))));
      console.log(`✓ ${file}`);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0), (error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
