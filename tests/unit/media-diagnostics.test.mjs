import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticMessageKey } from "../../src/features/media/diagnosticStatus.ts";
import { loadMediaDiagnosticsDismissed, saveMediaDiagnosticsDismissed, MEDIA_DIAGNOSTICS_DISMISSED_KEY } from "../../src/features/media/storage.ts";
import { en } from "../../src/i18n/sections/music.ts";

test("each diagnostic status maps to English copy", () => {
  for (const status of ["noTimeline", "needsUpdate", "smtcOff"]) {
    const key = diagnosticMessageKey(status);
    assert.equal(key, status);
    assert.ok(en.diagnostics[key].length > 0);
  }
  assert.equal(diagnosticMessageKey("ok"), null);
});

test("dismissed storage tolerates invalid JSON, old formats, malformed entries and denied storage", () => {
  let stored = null;
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (key, value) => {
    assert.equal(key, MEDIA_DIAGNOSTICS_DISMISSED_KEY); stored = value;
  } } };
  for (const value of [null, "{", "null", "{}", '"old"', '[1,null,{},"", "x\\u001fok"]']) {
    stored = value;
    assert.deepEqual(loadMediaDiagnosticsDismissed(), []);
  }
  const ids = ["cloudmusic.exe\u001fneteaseNeedsPlugin", "qqmusic.exe\u001fneedsUpdate"];
  saveMediaDiagnosticsDismissed([...ids, ids[0]]);
  assert.deepEqual(loadMediaDiagnosticsDismissed(), ids);
  globalThis.window = { get localStorage() { throw new Error("denied"); } };
  assert.deepEqual(loadMediaDiagnosticsDismissed(), []);
  assert.doesNotThrow(() => saveMediaDiagnosticsDismissed(ids));
  delete globalThis.window;
});
