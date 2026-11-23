// Writes the description of a GitHub release from what is already in the repository: the commits
// since the previous release (grouped into Added / Fixed / Changed), the installers with their
// SHA-256 checksums, how to verify them, and a link to the full comparison. release.mjs uses it
// when publishing; run it by hand to preview a description:
//
//   node scripts/release/release-notes.mjs [--tag v0.1.0] [--out notes.md]
//
// A hand-written docs/releases/vX.Y.Z.md still wins for the "What's new" part.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const REPO = process.env.GITHUB_REPOSITORY ?? "ahmad-maqsood/skerry";
/** The most commits listed when there is no earlier release to start from. */
const FIRST_RELEASE_LIMIT = 50;

/** [major, minor, patch, prerelease] of "v1.2.3" or "1.2.3-beta.1"; null if it is not a version. */
export function parseVersion(tag) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ?? ""] : null;
}

/** Negative if a is the older version; a release is newer than its own pre-releases. */
export function compareVersions(a, b) {
  const [left, right] = [parseVersion(a), parseVersion(b)];
  for (let part = 0; part < 3; part++) if (left[part] !== right[part]) return left[part] - right[part];
  if (left[3] === right[3]) return 0;
  if (!left[3]) return 1;
  if (!right[3]) return -1;
  return left[3] < right[3] ? -1 : 1;
}

/**
 * The release this one follows: the newest tag below it. A stable release skips pre-releases, so
 * its notes cover everything since the last stable one; a pre-release follows any earlier tag.
 */
export function previousTag(tag, tags) {
  const prerelease = Boolean(parseVersion(tag)?.[3]);
  return tags
    .filter((other) => parseVersion(other) && other !== tag && compareVersions(other, tag) < 0 && (prerelease || !parseVersion(other)[3]))
    .sort(compareVersions)
    .at(-1) ?? null;
}

const MAINTENANCE = /^(docs?|chore|ci|build|test|tests|style|refactor|perf)(\([^)]*\))?!?:\s*/i;
const FIXED = /^(fix|fixes|fixed|resolve|correct|repair|prevent|stop)\b/i;
const ADDED = /^(add|adds|added|introduce|support|allow|enable|let|show|pop|new)\b/i;
/** Commits that say nothing to a user of the release. */
const SKIPPED = /^(merge\b|bump\b|release\b|initial\b|revert "?merge|docs: refresh screenshots)/i;
/** Changes to documentation, CI and tooling: real work, but not something the app does differently. */
const BEHIND_THE_SCENES = /^(document|clarify|note|expand)\b|\b(CI|workflows?|screenshots?|license|licensing|readme)\b/i;

/** One commit line as [hash, subject], sorted into a group; null for the ones to leave out. */
export function classify(subject) {
  const text = subject.trim();
  if (!text || SKIPPED.test(text)) return null;
  const prefix = MAINTENANCE.exec(text);
  if (prefix) return { group: "Maintenance", text: text.slice(prefix[0].length) };
  if (BEHIND_THE_SCENES.test(text)) return { group: "Maintenance", text };
  const typed = /^(feat|feature)(\([^)]*\))?!?:\s*/i.exec(text);
  const plain = typed ? text.slice(typed[0].length) : text;
  if (/^fix(\([^)]*\))?!?:\s*/i.test(plain)) return { group: "Fixed", text: plain.replace(/^fix(\([^)]*\))?!?:\s*/i, "") };
  if (typed || ADDED.test(plain)) return { group: "Added", text: plain };
  if (FIXED.test(plain)) return { group: "Fixed", text: plain };
  return { group: "Changed", text: plain };
}

const upper = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const GROUPS = ["Added", "Fixed", "Changed", "Maintenance"];

/** The "What's new" Markdown from `git log` lines of "hash<TAB>subject". */
export function changesMarkdown(logLines, repo = REPO) {
  const groups = Object.fromEntries(GROUPS.map((name) => [name, []]));
  const seen = new Set();
  for (const line of logLines) {
    const [hash, ...rest] = line.split("\t");
    const entry = classify(rest.join("\t"));
    if (!entry || seen.has(entry.text.toLowerCase())) continue;
    seen.add(entry.text.toLowerCase());
    groups[entry.group].push(`- ${upper(entry.text)} ([\`${hash}\`](https://github.com/${repo}/commit/${hash}))`);
  }
  const sections = GROUPS.filter((name) => groups[name].length > 0).map((name) => `### ${name}\n\n${groups[name].join("\n")}`);
  return sections.length > 0 ? sections.join("\n\n") : "Maintenance and internal improvements.";
}

const FILE_KINDS = [
  [/_x64-setup\.exe$/, "Windows installer (64-bit). Recommended; in-app updates use it too."],
  [/\.msi$/, "Windows MSI installer (64-bit), for managed or scripted installs."],
];

/** The Markdown table of installers and their checksums; `assets` is [{ name, sha256 }]. */
export function downloadsTable(assets) {
  const rows = assets.map(({ name, sha256 }) => {
    const kind = FILE_KINDS.find(([pattern]) => pattern.test(name))?.[1] ?? "Release file.";
    return `| \`${name}\` | ${kind} | \`${sha256}\` |`;
  });
  return ["| File | What it is | SHA-256 |", "| --- | --- | --- |", ...rows].join("\n");
}

/** The whole description of a release. */
export function descriptionMarkdown({ repo = REPO, tag, changes, assets = [], previous = null }) {
  const prerelease = Boolean(parseVersion(tag)?.[3]);
  const first = assets[0]?.name ?? "Skerry-setup.exe";
  const parts = [
    prerelease ? "> **Pre-release.** In-app updates ignore it; install it by hand to try it." : "",
    `## What's new\n\n${changes.trim()}`,
  ];
  if (assets.length > 0) {
    parts.push(
      `## Downloads\n\n${downloadsTable(assets)}`,
      "Already running Skerry? Open **Settings → About** and it updates itself; there is nothing to download.",
      `To check a download, compare its hash with the table (or \`SHA256SUMS.txt\`):\n\n\`\`\`powershell\nGet-FileHash .\\${first} -Algorithm SHA256\n\`\`\``,
    );
  }
  parts.push(previous
    ? `**Full changelog**: [${previous}...${tag}](https://github.com/${repo}/compare/${previous}...${tag})`
    : `**Full history**: [commits up to ${tag}](https://github.com/${repo}/commits/${tag})`);
  return `${parts.filter(Boolean).join("\n\n")}\n`;
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

/** The "What's new" text for a tag: the hand-written file if there is one, else the git history. */
export function changesFor(tag, { notesFile = `docs/releases/${tag}.md`, repo = REPO } = {}) {
  if (existsSync(notesFile)) return { changes: readFileSync(notesFile, "utf8").trim(), previous: previousTag(tag, tagList()) };
  const previous = previousTag(tag, tagList());
  const range = previous ? [`${previous}..HEAD`] : ["-n", String(FIRST_RELEASE_LIMIT), "HEAD"];
  const lines = git(["log", "--no-merges", "--format=%h%x09%s", ...range]).split("\n").filter(Boolean);
  return { changes: changesMarkdown(lines, repo), previous };
}

function tagList() {
  return git(["tag", "--list", "v*"]).split("\n").filter(Boolean);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) => args[args.indexOf(name) + 1];
  const tag = args.includes("--tag") ? option("--tag") : `v${JSON.parse(readFileSync("package.json", "utf8")).version}`;
  const { changes, previous } = changesFor(tag);
  const text = descriptionMarkdown({ tag, changes, previous });
  if (args.includes("--out")) writeFileSync(option("--out"), text);
  else process.stdout.write(text);
}
