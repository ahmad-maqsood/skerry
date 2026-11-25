import test from "node:test";
import assert from "node:assert/strict";
import { PLUGINS_ENABLED } from "../../src/features/releaseFlags.ts";
import { SETTINGS_CATEGORIES, SETTINGS_GROUPS, settingsCategoryFor } from "../../src/windows/settings/categories.ts";
import { isPageEnabled } from "../../src/windows/island/features.ts";

test("plugins are switched on and the plugin settings route stays available", () => {
  assert.equal(PLUGINS_ENABLED, true);
  assert.equal(SETTINGS_CATEGORIES.includes("plugins"), true);
  assert.equal(SETTINGS_GROUPS.some((group) => group.categories.includes("plugins")), true);
  assert.equal(settingsCategoryFor("plugins"), "plugins");
  const features = { todo: false, music: false, clipboard: false, shelf: false,
    translation: false, qq: false };
  assert.equal(isPageEnabled("qq", features), false);
  assert.equal(isPageEnabled("qq", { ...features, qq: true }), true);
});
