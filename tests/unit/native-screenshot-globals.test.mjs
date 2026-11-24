import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// WebView2 makes window.__TAURI_INTERNALS__ read-only in every frame, so for the native screenshot
// capture vite.config.ts has the @tauri-apps packages read private globals instead.
async function transformedTauriModules(nativeScreenshots) {
  const previous = process.env.SKERRY_NATIVE_SCREENSHOTS;
  if (nativeScreenshots) process.env.SKERRY_NATIVE_SCREENSHOTS = "1";
  else delete process.env.SKERRY_NATIVE_SCREENSHOTS;
  const server = await createServer({
    root,
    logLevel: "silent",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    const modules = {};
    for (const name of ["@tauri-apps/api/core", "@tauri-apps/api/event", "@tauri-apps/api/window", "@tauri-apps/api/mocks", "@tauri-apps/plugin-opener"]) {
      const resolved = await server.pluginContainer.resolveId(name, path.join(root, "src/main.tsx"));
      assert.ok(resolved, `${name} resolves`);
      modules[name] = (await server.transformRequest(resolved.id))?.code ?? "";
    }
    return modules;
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.SKERRY_NATIVE_SCREENSHOTS;
    else process.env.SKERRY_NATIVE_SCREENSHOTS = previous;
  }
}

test("native screenshots point the Tauri API and its mocks at private globals", async () => {
  const modules = await transformedTauriModules(true);
  for (const [name, code] of Object.entries(modules)) {
    assert.doesNotMatch(code, /__TAURI_INTERNALS__|__TAURI_EVENT_PLUGIN_INTERNALS__/, `${name} no longer touches the locked globals`);
  }
  assert.match(modules["@tauri-apps/api/core"], /window\.__SKERRY_SCREENSHOT_INTERNALS__\.invoke/);
  assert.match(modules["@tauri-apps/api/event"], /__SKERRY_SCREENSHOT_EVENT_INTERNALS__/);
  assert.match(modules["@tauri-apps/api/window"], /__SKERRY_SCREENSHOT_INTERNALS__\.metadata/);
  assert.match(modules["@tauri-apps/api/mocks"], /window\.__SKERRY_SCREENSHOT_INTERNALS__ =/);
});

test("without the capture flag the Tauri packages are left alone", async () => {
  const modules = await transformedTauriModules(false);
  for (const [name, code] of Object.entries(modules)) {
    assert.doesNotMatch(code, /__SKERRY_SCREENSHOT/, `${name} is untouched`);
  }
});
