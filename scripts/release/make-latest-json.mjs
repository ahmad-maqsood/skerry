// Builds the updater manifest that the app downloads from
// https://github.com/ahmad-maqsood/skerry-island/releases/latest/download/latest.json
//
// Usage: node scripts/release/make-latest-json.mjs [--notes-file docs/releases/vX.Y.Z.md] [--base-url <url>]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { msiNames } from "./msi-version.mjs";

const REPO = process.env.GITHUB_REPOSITORY ?? "ahmad-maqsood/skerry-island";
const CONFIG = "src-tauri/tauri.conf.json";
const RELEASE_DIR = resolve(process.env.CARGO_TARGET_DIR || "src-tauri/target", "release");
const BUNDLE_DIR = join(RELEASE_DIR, "bundle/nsis");
const MSI_DIR = join(RELEASE_DIR, "bundle/msi");

export function createLatestManifest({ version, bundleDir, msiDir, baseUrl, notes = "" }) {
  if (!existsSync(bundleDir)) {
    throw new Error(`Missing ${bundleDir}. Run "pnpm tauri build" first.`);
  }

  const suffix = `_${version}_x64-setup.exe`;
  const installer = readdirSync(bundleDir).find((name) => name.endsWith(suffix));
  if (!installer) {
    throw new Error(`Missing NSIS installer ending with ${suffix} in ${bundleDir}.`);
  }

  const signaturePath = join(bundleDir, `${installer}.sig`);
  if (!existsSync(signaturePath)) {
    throw new Error(`Missing ${signaturePath}. Build with TAURI_SIGNING_PRIVATE_KEY set so updater artifacts are signed.`);
  }

  const msi = existsSync(msiDir) && readdirSync(msiDir).find((name) => msiNames(version).some((suffix) => name.endsWith(suffix)));
  const msiSignaturePath = msi && join(msiDir, `${msi}.sig`);
  if (!msiSignaturePath || !existsSync(msiSignaturePath)) {
    throw new Error(`Missing signed MSI installer in ${msiDir}. Build both nsis and msi release bundles first.`);
  }

  const nsisTarget = {
    signature: readFileSync(signaturePath, "utf8").trim(),
    url: `${baseUrl}/${installer}`,
  };

  return {
    version,
    notes,
    pub_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    platforms: {
      "windows-x86_64": nsisTarget,
      "windows-x86_64-nsis": nsisTarget,
      "windows-x86_64-msi": {
        signature: readFileSync(msiSignaturePath, "utf8").trim(),
        url: `${baseUrl}/${msi}`,
      },
    },
  };
}

export function writeLatestJson(manifest, bundleDir) {
  const target = join(bundleDir, "latest.json");
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  return target;
}

function readVersion() {
  return JSON.parse(readFileSync(CONFIG, "utf8")).version;
}

function main() {
  const args = process.argv.slice(2);
  const notesFlag = args.indexOf("--notes-file");
  const baseFlag = args.indexOf("--base-url");
  const version = readVersion();
  const baseUrl = baseFlag >= 0 ? args[baseFlag + 1]?.replace(/\/$/, "") : `https://github.com/${REPO}/releases/download/v${version}`;

  if (!baseUrl || !URL.canParse(baseUrl) || new URL(baseUrl).protocol !== "https:") {
    console.error("--base-url requires a valid HTTPS URL.");
    process.exit(1);
  }

  const notesFile = notesFlag >= 0 ? args[notesFlag + 1] : `docs/releases/v${version}.md`;
  const notes = notesFile && existsSync(notesFile) ? readFileSync(notesFile, "utf8").trim() : "";

  try {
    const manifest = createLatestManifest({
      version,
      bundleDir: BUNDLE_DIR,
      msiDir: MSI_DIR,
      baseUrl,
      notes,
    });
    const target = writeLatestJson(manifest, BUNDLE_DIR);
    console.log(`Wrote ${target}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
