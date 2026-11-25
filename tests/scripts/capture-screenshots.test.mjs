import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_SCALE, SHOTS, parseArgs, parseScale, pngSize, sceneUrl, selectShots, snapClip } from "../../scripts/capture-screenshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("every shot has its own PNG name and a scene", () => {
  const files = SHOTS.map((shot) => shot.file);
  assert.equal(new Set(files).size, files.length);
  for (const shot of SHOTS) {
    assert.match(shot.file, /^screenshot-[a-z-]+\.png$/, shot.file);
    assert.ok(shot.scene, shot.file);
  }
});

test("the shots are the ones the README shows and docs/SCREENSHOTS.md lists", () => {
  const readme = readFileSync(path.join(root, "README.md"), "utf8");
  const guide = readFileSync(path.join(root, "docs/SCREENSHOTS.md"), "utf8");
  for (const { file } of SHOTS) {
    assert.ok(readme.includes(`docs/assets/screenshots/${file}`), `README shows ${file}`);
    assert.ok(guide.includes(file), `docs/SCREENSHOTS.md lists ${file}`);
  }
});

test("the scene page the shots open exists", () => {
  assert.ok(existsSync(path.join(root, "tests/screenshots/scene.html")));
  assert.ok(existsSync(path.join(root, "tests/screenshots/scene.tsx")));
});

test("the capture runs in a browser, by hand or from the manual workflow: no native window, no automatic trigger", () => {
  const script = readFileSync(path.join(root, "scripts/capture-screenshots.mjs"), "utf8");
  assert.match(script, /withRegressionBrowser/);
  assert.doesNotMatch(script, /powershell|tauri dev|SKERRY_NATIVE_SCREENSHOTS/i);
  for (const gone of ["scripts/capture-window.ps1", "scripts/compose-screenshot-themes.ps1", "tests/screenshots/native-host.html"]) {
    assert.ok(!existsSync(path.join(root, gone)), `${gone} is removed`);
  }
  for (const workflow of readdirSync(path.join(root, ".github/workflows"))) {
    const text = readFileSync(path.join(root, ".github/workflows", workflow), "utf8");
    if (workflow === "screenshots.yml") continue;
    assert.doesNotMatch(text, /capture-screenshots|pnpm screenshots/, `${workflow} never takes screenshots`);
  }
  // The screenshots workflow starts only when someone runs it: no push, pull request or schedule.
  const manual = readFileSync(path.join(root, ".github/workflows/screenshots.yml"), "utf8");
  assert.match(manual, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(manual, /^\s+(push|pull_request|pull_request_target|schedule|workflow_run):/m);
});

test("the scenes show the app's default icon tabs, not capsules", () => {
  const scene = readFileSync(path.join(root, "tests/screenshots/scene.tsx"), "utf8");
  assert.doesNotMatch(scene, /pageButtonStyle/);
});

test("the pixel density is a whole number from 1 to 4, 3 by default", () => {
  assert.equal(DEFAULT_SCALE, 3);
  assert.equal(parseScale(undefined), 3);
  assert.equal(parseScale("2"), 2);
  for (const bad of ["0", "5", "1.5", "big"]) assert.throws(() => parseScale(bad), /--scale/);
});

test("a crop is snapped outward to whole pixels so no edge is resampled", () => {
  assert.deepEqual(snapClip({ x: 10.4, y: 0, width: 100.2, height: 50.5 }), { x: 10, y: 0, width: 101, height: 51 });
  assert.deepEqual(snapClip({ x: 5, y: 6, width: 7, height: 8 }), { x: 5, y: 6, width: 7, height: 8 });
});

test("a PNG's size is read from its header", () => {
  const header = Buffer.alloc(24);
  header.writeUInt32BE(2640, 16);
  header.writeUInt32BE(2220, 20);
  assert.deepEqual(pngSize(header), { width: 2640, height: 2220 });
});

test("words pick shots by scene or by file name; no words means all", () => {
  assert.equal(selectShots(SHOTS, []).length, SHOTS.length);
  assert.deepEqual(selectShots(SHOTS, ["music"]).map((shot) => shot.scene), ["music"]);
  assert.deepEqual(selectShots(SHOTS, ["translation", "settings"]).map((shot) => shot.scene), ["translation", "settings"]);
  assert.deepEqual(selectShots(SHOTS, ["themes"]).map((shot) => shot.file), ["screenshot-themes.png"]);
});

test("a word that matches no shot is refused with the list of scenes", () => {
  assert.throws(() => selectShots(SHOTS, ["nope"]), /No shot matches nope.*clock/);
});

test("--name=value options and plain words are told apart", () => {
  assert.deepEqual(parseArgs(["music", "--scale=2", "--out=./x", "--flag"]), { options: { scale: "2", out: "./x" }, words: ["music"] });
  assert.deepEqual(parseArgs([]), { options: {}, words: [] });
});

test("a scene URL carries the scene and any extra options", () => {
  const url = new URL(sceneUrl("http://localhost:1/tests/regression/", { scene: "messages" }, { material: "liquidGlass", wallpaper: "1" }));
  assert.equal(url.pathname, "/tests/screenshots/scene.html");
  assert.equal(url.searchParams.get("scene"), "messages");
  assert.equal(url.searchParams.get("material"), "liquidGlass");
  assert.equal(url.searchParams.get("wallpaper"), "1");
});
