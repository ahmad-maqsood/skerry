import assert from "node:assert/strict";
import test from "node:test";
import { validateSigningSecrets } from "../../scripts/release/release.mjs";

test("validateSigningSecrets succeeds when all secrets are present", () => {
  const env = {
    TAURI_SIGNING_PRIVATE_KEY: "secret-key-content",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "secret-password",
    TAURI_UPDATER_PUBKEY: "public-key-content",
  };
  assert.doesNotThrow(() => validateSigningSecrets(env));
});

test("validateSigningSecrets allows empty password string for keys without passphrase", () => {
  const env = {
    TAURI_SIGNING_PRIVATE_KEY: "secret-key-content",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "",
    TAURI_UPDATER_PUBKEY: "public-key-content",
  };
  assert.doesNotThrow(() => validateSigningSecrets(env));
});

test("validateSigningSecrets lists all missing secrets without printing secret values", () => {
  const env = {};
  assert.throws(
    () => validateSigningSecrets(env),
    (err) => {
      assert.match(err.message, /Missing required release secret\(s\):/);
      assert.match(err.message, /TAURI_SIGNING_PRIVATE_KEY/);
      assert.match(err.message, /TAURI_SIGNING_PRIVATE_KEY_PASSWORD/);
      assert.match(err.message, /TAURI_UPDATER_PUBKEY/);
      return true;
    },
  );
});

test("validateSigningSecrets lists only the specific missing secret", () => {
  const env = {
    TAURI_SIGNING_PRIVATE_KEY: "my-private-key-12345",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "my-password-abcde",
  };
  assert.throws(
    () => validateSigningSecrets(env),
    (err) => {
      assert.match(err.message, /TAURI_UPDATER_PUBKEY/);
      assert.doesNotMatch(err.message, /my-private-key-12345/);
      assert.doesNotMatch(err.message, /my-password-abcde/);
      assert.ok(!err.message.includes("TAURI_SIGNING_PRIVATE_KEY\n"));
      assert.ok(!err.message.includes("TAURI_SIGNING_PRIVATE_KEY_PASSWORD\n"));
      return true;
    },
  );
});
