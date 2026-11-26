import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const SECTIONS = ["What it shows", "Setup", "Settings", "Troubleshooting", "Privacy"];

const manifests = readdirSync(new URL("plugins/", root), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => new URL(`plugins/${entry.name}/skerry-plugin.json`, root))
  .filter((url) => existsSync(url))
  .map((url) => JSON.parse(readFileSync(url, "utf8")));

test("every plugin has a user guide that covers the required sections and its settings", () => {
  assert.ok(manifests.length > 0, "no plugin manifests found");
  for (const manifest of manifests) {
    const path = `docs/plugins/${manifest.id}.md`;
    assert.ok(existsSync(new URL(path, root)), `${path} is missing (see docs/plugins/README.md, "User guide")`);
    const guide = readFileSync(new URL(path, root), "utf8");
    const lines = guide.split(/\r?\n/);
    for (const section of SECTIONS) assert.ok(lines.includes(`## ${section}`), `${path} needs a "## ${section}" section`);
    const settings = guide.split(/^## Settings\r?$/m)[1].split(/^## /m)[0];
    for (const setting of manifest.settings ?? []) {
      const label = setting.label.en.split(" (")[0];
      assert.ok(settings.includes(label), `${path} does not describe the "${label}" setting`);
    }
  }
});
