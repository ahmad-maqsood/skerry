import assert from "node:assert/strict";
import test from "node:test";
import { checkFiles, countLines, inlineTestLines, lineLimitFor } from "../../scripts/check-file-size.mjs";

const lines = (count) => "x\n".repeat(count);

function rustWithTests(productionLines, testBodyLines) {
  return `${lines(productionLines)}#[cfg(test)]\nmod tests {\n${lines(testBodyLines)}}\n`;
}

test("physical lines ignore a final newline and accept CRLF", () => {
  assert.equal(countLines(""), 0);
  assert.equal(countLines("a"), 1);
  assert.equal(countLines("a\nb\n"), 2);
  assert.equal(countLines("a\r\nb\r\n\r\n"), 3);
});

test("limits follow the file type and exempt dictionaries and extracted Rust tests", () => {
  assert.equal(lineLimitFor("src/App.tsx"), 400);
  assert.equal(lineLimitFor("src/utils/text.ts"), 400);
  assert.equal(lineLimitFor("tests/i18n.test.mjs"), 400);
  assert.equal(lineLimitFor("src/App.css"), 500);
  assert.equal(lineLimitFor("src-tauri/src/lib.rs"), 800);
  assert.equal(lineLimitFor("src-tauri/scripts/example.ps1"), 400);
  assert.equal(lineLimitFor("src/i18n/locales/en.ts"), null);
  assert.equal(lineLimitFor("src/i18n/types.ts"), null);
  assert.equal(lineLimitFor("src/i18n/sections/settings/plugins.ts"), null);
  assert.equal(lineLimitFor("src-tauri/src/mail/tests.rs"), null);
  assert.equal(lineLimitFor("src/i18n/index.ts"), 400);
  assert.equal(lineLimitFor("docs/updater.md"), null);
});

test("inline test modules are measured from the attribute to the column-0 closing brace", () => {
  assert.equal(inlineTestLines(rustWithTests(10, 5)), 8);
  assert.equal(inlineTestLines("#[cfg(test)]\nfn helper() {}\n"), 0);
  assert.equal(inlineTestLines("#[cfg(test)]\nmod tests;\n"), 0);
  assert.equal(inlineTestLines("#[cfg(test)]\r\n#[allow(dead_code)]\r\nmod tests {\r\n    x\r\n}\r\nfn after() {}\r\n"), 5);
  const productionAfterTests = `${rustWithTests(2, 3)}${lines(4)}`;
  assert.equal(inlineTestLines(productionAfterTests), 6);
});

test("Rust production size excludes inline tests and oversized inline tests fail", () => {
  const ok = checkFiles([{ path: "src-tauri/src/a.rs", source: rustWithTests(800, 140) }]);
  assert.deepEqual(ok.errors, []);
  const tooManyTests = checkFiles([{ path: "src-tauri/src/a.rs", source: rustWithTests(10, 149) }]);
  assert.match(tooManyTests.errors.join("\n"), /inline test module lines 152 exceeds limit 150/);
});

test("new oversized files fail and exempt files are skipped", () => {
  const result = checkFiles([
    { path: "src/New.tsx", source: lines(401) },
    { path: "src/i18n/locales/en.ts", source: lines(5000) },
  ]);
  assert.equal(result.checked, 1);
  assert.deepEqual(result.errors, ["src/New.tsx: lines 401 exceeds limit 400"]);
});

test("allowlisted files may shrink but never grow", () => {
  const allowlist = { lines: { "src/App.tsx": 1000 } };
  assert.deepEqual(checkFiles([{ path: "src/App.tsx", source: lines(1000) }], allowlist), {
    checked: 1,
    errors: [],
    warnings: [],
  });
  assert.match(checkFiles([{ path: "src/App.tsx", source: lines(1001) }], allowlist).errors[0], /must not grow/);
  const shrunk = checkFiles([{ path: "src/App.tsx", source: lines(900) }], allowlist);
  assert.deepEqual(shrunk.errors, []);
  assert.match(shrunk.warnings[0], /from 1000 to 900/);
});

test("allowlist entries must be removed once a file fits or no longer exists", () => {
  const allowlist = { lines: { "src/App.tsx": 1000, "src/Gone.tsx": 900 }, inlineTests: { "src-tauri/src/gone.rs": 200 } };
  const errors = checkFiles([{ path: "src/App.tsx", source: lines(400) }], allowlist).errors.join("\n");
  assert.match(errors, /src\/App\.tsx: lines 400 is within limit 400; remove this entry from the allowlist/);
  assert.match(errors, /src\/Gone\.tsx: file in allowlist lines does not exist/);
  assert.match(errors, /src-tauri\/src\/gone\.rs: file in allowlist inlineTests does not exist/);
});
