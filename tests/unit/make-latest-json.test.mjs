import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLatestManifest, writeLatestJson } from "../../scripts/release/make-latest-json.mjs";

test("createLatestManifest generates valid updater manifest from bundle artifacts", () => {
  const root = mkdtempSync(join(tmpdir(), "skerry-test-manifest-"));
  const bundleDir = join(root, "nsis");
  const msiDir = join(root, "msi");
  const version = "0.1.0";

  try {
    mkdirSync(bundleDir, { recursive: true });
    mkdirSync(msiDir, { recursive: true });

    const nsisExe = `skerry_${version}_x64-setup.exe`;
    const msiFile = `skerry_${version}_x64_en-US.msi`;
    const nsisSig = "dW5pdGFzay1uc2lzLXNpZ25hdHVyZQ==";
    const msiSig = "dW5pdGFzay1tc2ktc2lnbmF0dXJl";

    writeFileSync(join(bundleDir, nsisExe), "fake-exe-content");
    writeFileSync(join(bundleDir, `${nsisExe}.sig`), nsisSig);
    writeFileSync(join(msiDir, msiFile), "fake-msi-content");
    writeFileSync(join(msiDir, `${msiFile}.sig`), msiSig);

    const baseUrl = `https://github.com/ahmad-maqsood/skerry-island/releases/download/v${version}`;
    const manifest = createLatestManifest({
      version,
      bundleDir,
      msiDir,
      baseUrl,
      notes: "Release notes for v0.1.0",
    });

    assert.equal(manifest.version, "0.1.0");
    assert.equal(manifest.notes, "Release notes for v0.1.0");
    assert.match(manifest.pub_date, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    assert.deepEqual(manifest.platforms["windows-x86_64"], {
      signature: nsisSig,
      url: `${baseUrl}/${nsisExe}`,
    });
    assert.deepEqual(manifest.platforms["windows-x86_64-nsis"], {
      signature: nsisSig,
      url: `${baseUrl}/${nsisExe}`,
    });
    assert.deepEqual(manifest.platforms["windows-x86_64-msi"], {
      signature: msiSig,
      url: `${baseUrl}/${msiFile}`,
    });

    const target = writeLatestJson(manifest, bundleDir);
    const readBack = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(readBack.version, "0.1.0");
    assert.equal(readBack.platforms["windows-x86_64-msi"].signature, msiSig);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("createLatestManifest throws if bundle directory or installers are missing", () => {
  const root = mkdtempSync(join(tmpdir(), "skerry-missing-"));
  try {
    assert.throws(
      () => createLatestManifest({
        version: "0.1.0",
        bundleDir: join(root, "nonexistent"),
        msiDir: root,
        baseUrl: "https://example.com",
      }),
      /Missing/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
