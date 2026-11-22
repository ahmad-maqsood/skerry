import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function calculateNextVersion(currentVersion, bumpType = "patch", isPrerelease = false) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(currentVersion);
  if (!match) throw new Error(`Invalid semantic version: ${currentVersion}`);

  let [major, minor, patch] = match.slice(1, 4).map(Number);
  const currentPre = match[4];

  if (bumpType === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === "minor") {
    minor += 1;
    patch = 0;
  } else if (bumpType === "patch") {
    if (currentPre && !isPrerelease) {
      // Releasing a prerelease: e.g. 1.2.4-beta.1 patch-bumped without prerelease becomes 1.2.4
    } else if (currentPre && isPrerelease) {
      // Already a prerelease; keep base version to increment the prerelease tag
    } else {
      patch += 1;
    }
  } else {
    throw new Error(`Unsupported bump type: ${bumpType}`);
  }

  const base = `${major}.${minor}.${patch}`;
  if (!isPrerelease) return base;

  // If already a prerelease for the same base, increment prerelease counter
  if (currentPre && currentVersion.startsWith(`${base}-`)) {
    const preMatch = /^([A-Za-z]+)\.(\d+)$/.exec(currentPre);
    if (preMatch) {
      const [, tag, num] = preMatch;
      return `${base}-${tag}.${Number(num) + 1}`;
    }
  }

  return `${base}-beta.1`;
}

export function updateVersionFiles(newVersion, rootDir = ".") {
  const pkgPath = resolve(rootDir, "package.json");
  const cargoPath = resolve(rootDir, "src-tauri/Cargo.toml");
  const lockPath = resolve(rootDir, "src-tauri/Cargo.lock");
  const tauriPath = resolve(rootDir, "src-tauri/tauri.conf.json");

  // package.json
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = newVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // tauri.conf.json
  const tauri = JSON.parse(readFileSync(tauriPath, "utf8"));
  tauri.version = newVersion;
  writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`);

  // src-tauri/Cargo.toml
  let cargo = readFileSync(cargoPath, "utf8");
  cargo = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
  writeFileSync(cargoPath, cargo);

  // src-tauri/Cargo.lock
  let lock = readFileSync(lockPath, "utf8");
  lock = lock.replace(
    /(name = "skerry"\r?\nversion = )"[^"]+"/,
    `$1"${newVersion}"`,
  );
  writeFileSync(lockPath, lock);
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args.find((arg) => ["patch", "minor", "major"].includes(arg)) ?? "patch";
  const isPrerelease = args.includes("--prerelease") || process.env.PRERELEASE === "true";

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const newVersion = calculateNextVersion(pkg.version, bumpType, isPrerelease);
  updateVersionFiles(newVersion);

  console.log(`Bumped version from ${pkg.version} to ${newVersion} (${bumpType}, prerelease=${isPrerelease})`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\ntag=v${newVersion}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main();
}
