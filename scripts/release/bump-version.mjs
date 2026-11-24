import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

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

export function isValidVersion(text) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(text);
}

/**
 * Turns what was typed into the new version: an exact version ("1.4.0" or "v1.4.0") or one of
 * patch / minor / major. Throws a readable message for anything else, or for the current version
 * (unless allowCurrent is set, which the Release workflow uses so a failed run can be started again).
 */
export function resolveRequestedVersion(input, currentVersion, { allowCurrent = false } = {}) {
  const text = String(input ?? "").trim().replace(/^v(?=\d)/i, "");
  if (["patch", "minor", "major"].includes(text)) return calculateNextVersion(currentVersion, text);
  if (!isValidVersion(text)) {
    throw new Error(`"${text}" is not a version. Use something like 1.4.0 or 1.4.0-beta.1, or patch / minor / major.`);
  }
  if (text === currentVersion && !allowCurrent) throw new Error(`The version is already ${currentVersion}.`);
  return text;
}

const VERSION_FILES = ["package.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock", "src-tauri/tauri.conf.json"];

async function askForVersion(rl, currentVersion) {
  const [patch, minor, major] = ["patch", "minor", "major"].map((type) => calculateNextVersion(currentVersion, type));
  console.log(`Current version: ${currentVersion}`);
  console.log(`  patch -> ${patch}   minor -> ${minor}   major -> ${major}`);
  for (;;) {
    const answer = (await rl.question(`New version (type e.g. 1.4.0, or patch/minor/major) [patch -> ${patch}]: `)).trim();
    try {
      return resolveRequestedVersion(answer || "patch", currentVersion);
    } catch (error) {
      console.log(`  ${error.message}`);
    }
  }
}

function git(args) {
  const result = spawnSync("git", args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed.`);
}

async function main() {
  const args = process.argv.slice(2);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const explicit = positional.find((arg) => isValidVersion(arg.replace(/^v(?=\d)/i, "")));
  const bumpType = positional.find((arg) => ["patch", "minor", "major"].includes(arg));
  const allowSame = args.includes("--allow-same");
  const isPrerelease = args.includes("--prerelease") || process.env.PRERELEASE === "true";
  // Something was typed but it is neither a version nor patch/minor/major: stop instead of guessing.
  if (positional.length > 0 && !explicit && !bumpType) {
    console.error(`\n✗ "${positional[0]}" is not a version. Use something like 1.4.0 or 1.4.0-beta.1, or patch / minor / major.`);
    process.exitCode = 1;
    return;
  }
  const interactive = !explicit && !bumpType && Boolean(process.stdin.isTTY);
  const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;

  try {
    let newVersion;
    if (explicit) newVersion = resolveRequestedVersion(explicit, pkg.version, { allowCurrent: allowSame });
    else if (interactive) newVersion = await askForVersion(rl, pkg.version);
    else newVersion = calculateNextVersion(pkg.version, bumpType ?? "patch", isPrerelease);

    updateVersionFiles(newVersion);
    console.log(`\nVersion changed from ${pkg.version} to ${newVersion} in:`);
    for (const file of VERSION_FILES) console.log(`  - ${file}`);

    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\ntag=v${newVersion}\n`);
    }

    if (interactive || args.includes("--commit")) {
      const yes = args.includes("--commit") || /^y(es)?$/i.test((await rl.question("\nCommit and push this to the current branch? [y/N]: ")).trim());
      if (yes) {
        git(["add", ...VERSION_FILES]);
        git(["commit", "-m", `Bump version to ${newVersion}`]);
        git(["push"]);
        console.log(`\nPushed. Next: GitHub -> Actions -> Release -> Run workflow (version v${newVersion}).`);
      } else {
        console.log(`\nNot committed. Commit and push the four files, then run the Release workflow.`);
      }
    }
  } catch (error) {
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl?.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main();
}
