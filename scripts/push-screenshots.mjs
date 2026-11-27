// Commits and pushes freshly captured README screenshots: `pnpm screenshots --push`, which the manual
// Screenshots workflow runs as well. Only the screenshot files are staged, so nothing else in the
// checkout is ever swept into the commit; and when the pictures are byte-for-byte the ones already on
// the branch, nothing is committed at all.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/** Where the README looks for its pictures; --push puts the new ones there whatever --out says. */
export const SCREENSHOTS_DIR = "docs/assets/screenshots";
export const COMMIT_MESSAGE = "doc: update screenshots";

/** Runs git in `root` and returns its trimmed output; a failure throws with git's own message. */
export function gitRunner(root) {
  return (args) => {
    try {
      return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    } catch (error) {
      const detail = `${error.stderr ?? ""}${error.stdout ?? ""}`.trim() || error.message;
      throw new Error(`git ${args[0]} failed: ${detail}`);
    }
  };
}

/**
 * The branch to push: the one asked for with --branch, else the one checked out. A detached HEAD
 * has no branch to push to, and a name that git could read as an option is refused.
 */
export function resolveBranch(run, requested) {
  const branch = requested || run(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch || branch === "HEAD") throw new Error("--push needs a branch: HEAD is detached, so pass --branch=<name>.");
  if (!/^[\w][\w./-]*$/.test(branch) || branch.includes("..") || branch.endsWith("/") || branch.endsWith(".lock")) {
    throw new Error(`"${branch}" is not a branch name --push can use.`);
  }
  return branch;
}

/**
 * Puts `files` in docs/assets/screenshots (they may have been captured into another folder), commits
 * the ones that changed and pushes `branch`. When the branch has moved on since this checkout, the
 * commit is rebased onto it once and pushed again. Returns the paths that were committed.
 */
export function pushScreenshots({ root, files, branch, run = gitRunner(root), log = console.log }) {
  const target = path.join(root, SCREENSHOTS_DIR);
  mkdirSync(target, { recursive: true });
  const relative = files.map((file) => {
    const destination = path.join(target, path.basename(file));
    if (path.resolve(file) !== destination) copyFileSync(file, destination);
    return `${SCREENSHOTS_DIR}/${path.basename(file)}`;
  });
  run(["add", "--", ...relative]);
  const changed = run(["diff", "--cached", "--name-only", "--", ...relative]).split(/\r?\n/).filter(Boolean);
  if (!changed.length) {
    log(`The screenshots match the ones already on ${branch}; nothing to push.`);
    return [];
  }
  run(["commit", "-m", COMMIT_MESSAGE, "--", ...relative]);
  const ref = `HEAD:refs/heads/${branch}`;
  try {
    run(["push", "origin", ref]);
  } catch {
    run(["pull", "--rebase", "origin", branch]);
    run(["push", "origin", ref]);
  }
  log(`Pushed ${changed.length} screenshot(s) to ${branch}.`);
  return changed;
}
