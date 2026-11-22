// Enforces the per-file line limits from AGENTS.md. Files that already exceeded a limit
// are listed in file-size-allowlist.json with their current size and may only shrink.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SCAN_ROOTS = ["src", "src-tauri/src", "src-tauri/examples", "scripts", "tests", "packages", "plugins", "web-demo"];
export const INLINE_TEST_LIMIT = 150;

const LINE_LIMITS = {
  ".ts": 400,
  ".tsx": 400,
  ".mjs": 400,
  ".css": 500,
  ".rs": 800,
  ".ps1": 400,
  ".cmd": 400,
};

// Translation dictionaries grow with copy, and extracted Rust test files hold tests only.
const EXEMPT_PATTERNS = [
  /^src\/i18n\/locales\/[^/]+\.ts$/,
  /^src\/i18n\/sections\/.+\.ts$/,
  /^src\/i18n\/types\.ts$/,
  /(^|\/)tests\.rs$/,
];
const SKIPPED_DIRECTORIES = new Set(["node_modules", "target", "gen", "dist"]);

export function countLines(source) {
  if (source === "") return 0;
  const lines = source.split(/\r?\n/);
  return lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}

/** Returns the line limit for a repository-relative path, or null when the file is not checked. */
export function lineLimitFor(path) {
  if (EXEMPT_PATTERNS.some((pattern) => pattern.test(path))) return null;
  const dot = path.lastIndexOf(".");
  if (dot < 0) return null;
  return LINE_LIMITS[path.slice(dot)] ?? null;
}

/**
 * Counts lines of top-level `#[cfg(test)] mod x { ... }` blocks, from the attribute to the
 * closing brace in column 0. External `mod tests;` declarations are not counted.
 */
export function inlineTestLines(source) {
  const lines = source.split(/\r?\n/);
  let total = 0;
  for (let start = 0; start < lines.length; start += 1) {
    if (!/^#\[cfg\(test\)\]\s*$/.test(lines[start])) continue;
    let declaration = start + 1;
    while (declaration < lines.length && /^\s*(#\[|\/\/|$)/.test(lines[declaration])) declaration += 1;
    if (!/^(pub(\([a-z]+\))?\s+)?mod\s+\w+\s*\{/.test(lines[declaration] ?? "")) continue;
    let end = declaration + 1;
    while (end < lines.length && lines[end].trimEnd() !== "}") end += 1;
    total += Math.min(end, lines.length - 1) - start + 1;
    start = end;
  }
  return total;
}

function ratchet(result, { path, label, value, limit, allowed }) {
  if (allowed === undefined) {
    if (value > limit) result.errors.push(`${path}: ${label} ${value} exceeds limit ${limit}`);
    return;
  }
  if (value > allowed) {
    result.errors.push(`${path}: ${label} ${value} exceeds allowlist ${allowed}; legacy files must not grow`);
  } else if (value <= limit) {
    result.errors.push(`${path}: ${label} ${value} is within limit ${limit}; remove this entry from the allowlist`);
  } else if (value < allowed) {
    result.warnings.push(`${path}: ${label} dropped to ${value}; update allowlist entry from ${allowed} to ${value}`);
  }
}

/**
 * Checks `{ path, source }` entries against the limits and the allowlist.
 * Paths are repository-relative and use forward slashes.
 */
export function checkFiles(files, allowlist = {}) {
  const lineAllowlist = allowlist.lines ?? {};
  const inlineTestAllowlist = allowlist.inlineTests ?? {};
  const result = { checked: 0, errors: [], warnings: [] };
  const checkedPaths = new Set();

  for (const { path, source } of files) {
    const limit = lineLimitFor(path);
    if (limit === null) continue;
    result.checked += 1;
    checkedPaths.add(path);
    const isRust = path.endsWith(".rs");
    const testLines = isRust ? inlineTestLines(source) : 0;
    ratchet(result, {
      path,
      label: isRust ? "production code lines" : "lines",
      value: countLines(source) - testLines,
      limit,
      allowed: lineAllowlist[path],
    });
    if (isRust) {
      ratchet(result, {
        path,
        label: "inline test module lines",
        value: testLines,
        limit: INLINE_TEST_LIMIT,
        allowed: inlineTestAllowlist[path],
      });
    }
  }

  for (const [section, entries] of [["lines", lineAllowlist], ["inlineTests", inlineTestAllowlist]]) {
    for (const path of Object.keys(entries)) {
      if (!checkedPaths.has(path)) {
        result.errors.push(`${path}: file in allowlist ${section} does not exist or is not within scanned roots; remove this entry`);
      }
    }
  }
  return result;
}

export function collectFiles(root, scanRoots = SCAN_ROOTS) {
  const files = [];
  const visit = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) visit(fullPath);
      } else if (entry.isFile()) {
        const path = relative(root, fullPath).split(sep).join("/");
        if (lineLimitFor(path) !== null) files.push({ path, source: readFileSync(fullPath, "utf8") });
      }
    }
  };
  for (const scanRoot of scanRoots) visit(join(root, scanRoot));
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const allowlist = JSON.parse(readFileSync(join(root, "scripts", "file-size-allowlist.json"), "utf8"));
  const { checked, errors, warnings } = checkFiles(collectFiles(root), allowlist);
  for (const warning of warnings) console.warn(`Warning: ${warning}`);
  for (const error of errors) console.error(`Error: ${error}`);
  console.log(`Checked ${checked} files: ${errors.length} errors, ${warnings.length} warnings.`);
  if (errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
