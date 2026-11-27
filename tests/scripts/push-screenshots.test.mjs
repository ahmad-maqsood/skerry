import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { COMMIT_MESSAGE, SCREENSHOTS_DIR, gitRunner, pushScreenshots, resolveBranch } from "../../scripts/push-screenshots.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** A bare "remote" and a clone of it with one commit on main, in a fresh temp folder. */
function repoWithRemote() {
  const base = mkdtempSync(path.join(tmpdir(), "skerry-push-"));
  const remote = path.join(base, "remote.git");
  git(base, "init", "--bare", "-b", "main", remote);
  const clone = (name) => {
    const dir = path.join(base, name);
    git(base, "clone", "-q", remote, dir);
    git(dir, "config", "user.name", "Tester");
    git(dir, "config", "user.email", "tester@example.com");
    git(dir, "config", "commit.gpgsign", "false");
    return dir;
  };
  const work = clone("work");
  git(work, "checkout", "-q", "-b", "main");
  writeFileSync(path.join(work, "README.md"), "hi\n");
  git(work, "add", "README.md");
  git(work, "commit", "-q", "-m", "first");
  git(work, "push", "-q", "-u", "origin", "main");
  return { base, remote, work, clone };
}

const png = (text) => Buffer.from(`PNG ${text}`);

test("a branch is the one asked for or the checked-out one, never a detached HEAD or an option-like name", () => {
  assert.equal(resolveBranch(() => "feature/x", undefined), "feature/x");
  assert.equal(resolveBranch(() => { throw new Error("not asked"); }, "improve/fixes"), "improve/fixes");
  assert.throws(() => resolveBranch(() => "HEAD", undefined), /detached/);
  for (const bad of ["--force", "-x", "a..b", "a b", "topic/", "x.lock", "a;rm"]) {
    assert.throws(() => resolveBranch(() => "main", bad), /not a branch name/, bad);
  }
});

test("new screenshots are committed alone and pushed to the branch", () => {
  const { base, remote, work } = repoWithRemote();
  try {
    git(work, "checkout", "-q", "-b", "topic");
    writeFileSync(path.join(work, "unrelated.txt"), "not a screenshot\n");
    git(work, "add", "unrelated.txt");
    const out = path.join(work, "shots-out");
    mkdirSync(out);
    writeFileSync(path.join(out, "screenshot-a.png"), png("a"));
    writeFileSync(path.join(out, "screenshot-b.png"), png("b"));
    const logs = [];
    const changed = pushScreenshots({
      root: work, files: [path.join(out, "screenshot-a.png"), path.join(out, "screenshot-b.png")], branch: "topic", log: (line) => logs.push(line),
    });
    assert.deepEqual(changed, [`${SCREENSHOTS_DIR}/screenshot-a.png`, `${SCREENSHOTS_DIR}/screenshot-b.png`]);
    assert.match(logs.join("\n"), /Pushed 2 screenshot/);
    assert.equal(git(remote, "log", "-1", "--format=%s", "topic"), COMMIT_MESSAGE);
    assert.deepEqual(git(remote, "show", "--name-only", "--format=", "topic").split("\n").sort(), changed);
    assert.equal(git(remote, "show", `topic:${SCREENSHOTS_DIR}/screenshot-a.png`), "PNG a");
    // The file that was staged before is left staged and is not in the screenshots commit.
    assert.equal(git(work, "diff", "--cached", "--name-only"), "unrelated.txt");
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("pictures identical to the ones on the branch commit and push nothing", () => {
  const { base, remote, work } = repoWithRemote();
  try {
    const file = path.join(work, SCREENSHOTS_DIR, "screenshot-a.png");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png("a"));
    assert.equal(pushScreenshots({ root: work, files: [file], branch: "main", log: () => {} }).length, 1);
    const head = git(remote, "rev-parse", "main");
    const logs = [];
    assert.deepEqual(pushScreenshots({ root: work, files: [file], branch: "main", log: (line) => logs.push(line) }), []);
    assert.match(logs.join("\n"), /nothing to push/);
    assert.equal(git(remote, "rev-parse", "main"), head);
    writeFileSync(file, png("a, redrawn"));
    assert.equal(pushScreenshots({ root: work, files: [file], branch: "main", log: () => {} }).length, 1);
    assert.equal(readFileSync(file, "utf8"), "PNG a, redrawn");
    assert.notEqual(git(remote, "rev-parse", "main"), head);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a branch that moved on since the checkout is rebased onto once, then pushed", () => {
  const { base, remote, work, clone } = repoWithRemote();
  try {
    const other = clone("other");
    writeFileSync(path.join(other, "NOTES.md"), "someone else\n");
    git(other, "add", "NOTES.md");
    git(other, "commit", "-q", "-m", "someone else pushed");
    git(other, "push", "-q", "origin", "main");
    const file = path.join(work, SCREENSHOTS_DIR, "screenshot-a.png");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png("a"));
    pushScreenshots({ root: work, files: [file], branch: "main", log: () => {} });
    assert.equal(git(remote, "log", "--format=%s", "-3", "main"), `${COMMIT_MESSAGE}\nsomeone else pushed\nfirst`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("a refused push says why instead of passing quietly", () => {
  const { base, work } = repoWithRemote();
  try {
    const file = path.join(work, SCREENSHOTS_DIR, "screenshot-a.png");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, png("a"));
    git(work, "remote", "set-url", "origin", path.join(base, "missing.git"));
    assert.throws(() => pushScreenshots({ root: work, files: [file], branch: "main", run: gitRunner(work), log: () => {} }), /git (push|pull) failed/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("the manual workflow commits only on request and still uploads the images", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/screenshots.yml"), "utf8");
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /commit:\s*\n\s+description:[^\n]*\n\s+required: false\n\s+type: boolean\n\s+default: true/);
  assert.match(workflow, /--push --branch="\$REF_NAME"/);
  assert.match(workflow, /"\$REF_TYPE" = "branch"/);
  assert.match(workflow, /if: \$\{\{ !cancelled\(\) \}\}\s*\n\s+uses: actions\/upload-artifact/);
  assert.doesNotMatch(workflow, /pull-requests|gh pr|create-pull-request/);
  // Inputs reach the script through env, never inside the text of a run block.
  const lines = workflow.split("\n");
  lines.forEach((line, index) => {
    const run = /^(\s+)run:/.exec(line);
    if (!run) return;
    const block = [line];
    for (let next = index + 1; next < lines.length && (!lines[next].trim() || lines[next].search(/\S/) > run[1].length); next += 1) block.push(lines[next]);
    assert.doesNotMatch(block.join("\n"), /\$\{\{/, `run block at line ${index + 1} holds no expression`);
  });
});
