import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SHOTS, parseArgs, sceneUrl, selectShots } from "../../scripts/capture-screenshots.mjs";

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

test("the native window opens the iframe host, never scene.html as its top page", () => {
  const script = readFileSync(path.join(root, "scripts/capture-screenshots.mjs"), "utf8");
  assert.match(script, /tests\/screenshots\/native-host\.html\?\$\{query\}/);
  assert.doesNotMatch(script, /const url = `tests\/screenshots\/scene\.html/);
  const host = readFileSync(path.join(root, "tests/screenshots/native-host.html"), "utf8");
  assert.match(host, /document\.getElementById\("scene"\)\.src = \`scene\.html\$\{window\.location\.search\}\`/);
});

test("native screenshot mocks mutate Tauri internals instead of replacing the read-only window property", () => {
  const scene = readFileSync(path.join(root, "tests/screenshots/scene.tsx"), "utf8");
  const mocks = readFileSync(path.join(root, "tests/screenshots/tauriMocks.ts"), "utf8");
  assert.match(scene, /from "\.\/tauriMocks"/);
  assert.doesNotMatch(scene, /from "@tauri-apps\/api\/mocks"/);
  assert.match(mocks, /tauri\.invoke = invoke/);
  assert.match(mocks, /tauri\.transformCallback = registerCallback/);
  assert.doesNotMatch(mocks, /window\.__TAURI_INTERNALS__\s*=/);
});

test("words pick shots by scene or by file name; no words means all", () => {
  assert.equal(selectShots(SHOTS, []).length, SHOTS.length);
  assert.deepEqual(selectShots(SHOTS, ["music"]).map((shot) => shot.scene), ["music"]);
  assert.deepEqual(selectShots(SHOTS, ["clipboard", "settings"]).map((shot) => shot.scene), ["clipboard", "settings"]);
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
