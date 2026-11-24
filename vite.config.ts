import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const enabledRegressionFeatures = process.env.SKERRY_REGRESSION_FEATURES === "enabled";
// @ts-expect-error process is a nodejs global
const nativeScreenshots = process.env.SKERRY_NATIVE_SCREENSHOTS === "1";

// The native WebView (WebView2) gives every frame a read-only, non-configurable
// window.__TAURI_INTERNALS__, so the screenshot scenes cannot mock Tauri's IPC by replacing it.
// While scripts/capture-screenshots.mjs runs the app (SKERRY_NATIVE_SCREENSHOTS=1), the
// @tauri-apps packages are therefore pointed at private globals that nothing locks: the scene's
// mockIPC()/mockWindows() and the API they mock both use these names, and the real Tauri IPC is
// never touched.
const SCREENSHOT_TAURI_GLOBALS: [string, string][] = [
  ["__TAURI_INTERNALS__", "__SKERRY_SCREENSHOT_INTERNALS__"],
  ["__TAURI_EVENT_PLUGIN_INTERNALS__", "__SKERRY_SCREENSHOT_EVENT_INTERNALS__"],
];
const TAURI_PACKAGE_FILE = /[\\/]node_modules[\\/]@tauri-apps[\\/]/;

// https://vite.dev/config/
export default defineConfig(async ({ command }) => ({
  plugins: [react(), {
    name: "native-screenshot-tauri-globals",
    enforce: "pre",
    transform(code, id) {
      if (command !== "serve" || !nativeScreenshots || !TAURI_PACKAGE_FILE.test(id.split("?")[0])) return null;
      let renamed = code;
      for (const [from, to] of SCREENSHOT_TAURI_GLOBALS) renamed = renamed.replaceAll(from, to);
      return renamed === code ? null : { code: renamed, map: null };
    },
  }, {
    name: "enabled-release-feature-fixtures",
    enforce: "pre",
    load(id) {
      // Test fixtures can exercise retained features; production builds always use the file.
      if (command === "serve" && enabledRegressionFeatures && id.split("?")[0].endsWith("/release-features.json")) {
        return JSON.stringify({ plugins: true, mailOtp: true });
      }
    },
  }],

  // Served as-is (not pre-bundled) so the plugin above sees the @tauri-apps files.
  optimizeDeps: nativeScreenshots
    ? { exclude: ["@tauri-apps/api", "@tauri-apps/plugin-opener", "@tauri-apps/plugin-updater"] }
    : undefined,

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available.
  //    The regression runner passes its own `--port`, so it never takes 1420.
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
