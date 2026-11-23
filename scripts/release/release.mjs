// Builds, signs and publishes a release that in-app updates can pick up.
//
// Usage:
//   pnpm release [--base-url <url>] [--no-upload] [--nsis-only]
//   --nsis-only (with --no-upload) builds just the signed NSIS installer, for a quick trial.
//
// Required CI environment variables (repository secrets):
//   TAURI_SIGNING_PRIVATE_KEY           private key content (or path to key file)
//   TAURI_SIGNING_PRIVATE_KEY_PASSWORD  passphrase for private key (empty string if none)
//   TAURI_UPDATER_PUBKEY                public key matching the private key
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msiNames, msiVersion } from "./msi-version.mjs";
import { changesFor, descriptionMarkdown } from "./release-notes.mjs";

const CONFIG = "src-tauri/tauri.conf.json";
const OVERLAY = "src-tauri/tauri.release.conf.json";
const CARGO = "src-tauri/Cargo.toml";
const RELEASE_DIR = resolve(process.env.CARGO_TARGET_DIR || "src-tauri/target", "release").replaceAll("\\", "/");
const BUNDLE_DIR = `${RELEASE_DIR}/bundle/nsis`;
const MSI_DIR = `${RELEASE_DIR}/bundle/msi`;
const MSI_OVERLAY = `${RELEASE_DIR}/msi-version.conf.json`;
const REPO = process.env.GITHUB_REPOSITORY ?? "ahmad-maqsood/skerry";
const releaseFeatures = JSON.parse(readFileSync("release-features.json", "utf8"));

export function validateSigningSecrets(env = process.env) {
  const missing = [];
  if (!env.TAURI_SIGNING_PRIVATE_KEY?.trim()) {
    missing.push("TAURI_SIGNING_PRIVATE_KEY");
  }
  if (env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD === undefined) {
    missing.push("TAURI_SIGNING_PRIVATE_KEY_PASSWORD");
  }
  if (!env.TAURI_UPDATER_PUBKEY?.trim()) {
    missing.push("TAURI_UPDATER_PUBKEY");
  }
  if (missing.length > 0) {
    const list = missing.map((name) => `  - ${name}`).join("\n");
    throw new Error(
      `Missing required release secret(s):\n${list}\n` +
      "Configure them in Repository Settings -> Secrets and variables -> Actions."
    );
  }
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  if (result.error) fail(`${command} failed: ${result.error.message}`);
  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

/**
 * What the command line asks for. `--nsis-only` is a quick trial build: no MSI (which needs the
 * WiX tools and a second bundling pass) and no update manifest (which lists the MSI), so it can
 * never be published.
 */
export function parseReleaseArgs(args) {
  const baseFlag = args.indexOf("--base-url");
  const baseUrl = baseFlag >= 0 ? args[baseFlag + 1] : "";
  const upload = !args.includes("--no-upload");
  const nsisOnly = args.includes("--nsis-only");
  if (baseFlag >= 0 && (!baseUrl || !URL.canParse(baseUrl) || new URL(baseUrl).protocol !== "https:")) {
    throw new Error("--base-url requires a valid HTTPS URL.");
  }
  if (nsisOnly && upload) {
    throw new Error("--nsis-only is a trial build and cannot be published: the update manifest needs the MSI. Add --no-upload.");
  }
  return { baseUrl, upload, nsisOnly };
}

export function runRelease() {
  let options;
  try {
    options = parseReleaseArgs(process.argv.slice(2));
    validateSigningSecrets(process.env);
  } catch (error) {
    fail(error.message);
  }
  const { baseUrl, upload, nsisOnly } = options;

  const version = JSON.parse(readFileSync(CONFIG, "utf8")).version;
  const pkgVersion = JSON.parse(readFileSync("package.json", "utf8")).version;
  const cargoVersion = readFileSync(CARGO, "utf8").match(/^version\s*=\s*"([^"]+)"/m)?.[1];

  if (!cargoVersion) fail(`Could not read the version from ${CARGO}.`);
  if (pkgVersion !== version || cargoVersion !== version) {
    fail(
      `Version mismatch: package.json=${pkgVersion}, Cargo.toml=${cargoVersion}, tauri.conf.json=${version}.\n` +
        "Bump all three to the same value before releasing.",
    );
  }

  const tag = `v${version}`;
  // What's new: docs/releases/vX.Y.Z.md if someone wrote it, otherwise the commits since the last
  // release. It is the update dialog's notes (latest.json) and the top of the release description.
  const { changes, previous } = nsisOnly ? { changes: "", previous: null } : changesFor(tag);
  const changesFile = `${RELEASE_DIR}/release-changes.md`;
  const descriptionFile = `${RELEASE_DIR}/release-notes.md`;

  if (upload) {
    const existing = run("gh", ["release", "view", tag, "--repo", REPO], { capture: true, allowFailure: true });
    if (existing.status === 0) {
      fail(`Release ${tag} already exists. Bump the version instead of replacing published update packages.`);
    }
  }

  run("node", ["scripts/release/prepare-release-config.mjs"]);
  const configs = ["--config", OVERLAY];
  let wixVersion;
  try {
    wixVersion = nsisOnly ? undefined : msiVersion(version);
  } catch (error) {
    fail(error.message);
  }
  if (wixVersion) {
    mkdirSync(dirname(MSI_OVERLAY), { recursive: true });
    writeFileSync(MSI_OVERLAY, `${JSON.stringify({ bundle: { windows: { wix: { version: wixVersion } } } })}\n`);
    configs.push("--config", MSI_OVERLAY);
    console.log(`MSI version for ${version}: ${wixVersion}`);
  }
  run("pnpm", ["tauri", "build", "--ci", ...configs, "--bundles", nsisOnly ? "nsis" : "nsis,msi"]);

  if (!nsisOnly) {
    writeFileSync(changesFile, `${changes}\n`);
    const latestArgs = ["scripts/release/make-latest-json.mjs", "--notes-file", changesFile];
    if (baseUrl) latestArgs.push("--base-url", baseUrl);
    run("node", latestArgs);
  }

  if (releaseFeatures.plugins) {
    run("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/release/build-plugins.ps1",
      "-BaseUrl",
      baseUrl || `https://github.com/${REPO}/releases/download/${tag}`,
    ]);
  }

  const installer = readdirSync(BUNDLE_DIR).find((name) => name.endsWith(`_${version}_x64-setup.exe`));
  if (!installer) fail(`Missing installer in ${BUNDLE_DIR}.`);
  const installers = [`${BUNDLE_DIR}/${installer}`];
  if (!nsisOnly) {
    const msi = readdirSync(MSI_DIR).find((name) => msiNames(version).some((suffix) => name.endsWith(suffix)));
    if (!msi) fail(`Missing MSI installer in ${MSI_DIR}.`);
    installers.push(`${MSI_DIR}/${msi}`);
  }
  const checksumPath = `${BUNDLE_DIR}/SHA256SUMS.txt`;
  writeFileSync(
    checksumPath,
    installers.map((path) => `${createHash("sha256").update(readFileSync(path)).digest("hex")}  ${path.split("/").pop()}`).join("\n") + "\n",
  );

  if (!upload) {
    console.log(nsisOnly
      ? `\n✓ Built v${version} as a trial (NSIS only, no update manifest): ${BUNDLE_DIR}.`
      : `\n✓ Built v${version}. NSIS: ${BUNDLE_DIR}; MSI: ${MSI_DIR} (--no-upload).`);
    return;
  }

  const pluginAssets = releaseFeatures.plugins
    ? readdirSync("artifacts/plugins")
        .filter((name) => name.endsWith(".zip") || name === "plugins-index.json")
        .map((name) => `artifacts/plugins/${name}`)
    : [];
  const assets = [...installers, ...installers.map((path) => `${path}.sig`), `${BUNDLE_DIR}/latest.json`, checksumPath, ...pluginAssets];
  const revision = run("git", ["rev-parse", "HEAD"], { capture: true }).stdout.trim();
  const prerelease = version.includes("-");
  // The release description: what's new, the installers with their checksums, how to verify them.
  const described = installers.map((path) => ({ name: path.split("/").pop(), sha256: createHash("sha256").update(readFileSync(path)).digest("hex") }));
  writeFileSync(descriptionFile, descriptionMarkdown({ tag, changes, assets: described, previous }));
  console.log(`\nRelease description (${descriptionFile}):\n\n${readFileSync(descriptionFile, "utf8")}`);

  run("gh", [
    "release",
    "create",
    tag,
    "--repo",
    REPO,
    "--target",
    revision,
    "--draft",
    ...(prerelease ? ["--prerelease"] : []),
    "--title",
    tag,
    "--notes-file",
    descriptionFile,
    ...assets,
  ]);

  const releaseId = run("gh", ["release", "view", tag, "--repo", REPO, "--json", "databaseId", "--jq", ".databaseId"], {
    capture: true,
  }).stdout.trim();
  const remote = JSON.parse(run("gh", ["api", `repos/${REPO}/releases/${releaseId}`], { capture: true }).stdout);
  for (const path of assets) {
    const name = path.split("/").pop();
    const asset = remote.assets.find((entry) => entry.name === name);
    const digest = `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
    if (!asset || asset.state !== "uploaded" || asset.digest !== digest) {
      fail(`Uploaded asset verification failed for ${name}. The release remains a draft.`);
    }
  }

  run("gh", [
    "release",
    "edit",
    tag,
    "--repo",
    REPO,
    "--draft=false",
    ...(prerelease ? ["--prerelease", "--latest=false"] : ["--latest"]),
  ]);
  console.log(`\n✓ Published ${tag}${prerelease ? " as a pre-release" : ""}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRelease();
}
