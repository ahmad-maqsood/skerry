import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(root, "src/windows/island/IslandHeader.css"), "utf8");
const types = readFileSync(path.join(root, "src/features/appearance/types.ts"), "utf8");

// A tab without --dot-color drew no capsule (a gap among the dots), an untinted icon and no
// highlight when it was the open page.
test("every page dot and the messages dot has its own colour and glow", () => {
  const union = /export type PageDot\s*=([^;]+);/.exec(types)?.[1] ?? "";
  const dots = (union.match(/"([a-z]+)"/g) ?? []).map((word) => word.slice(1, -1));
  assert.ok(dots.length >= 6, `found the page dots: ${dots.join(", ")}`);
  for (const dot of [...dots, "messages"]) {
    const rule = new RegExp(`\\.dot-button--${dot}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
    assert.match(rule, /--dot-color:\s*(#[0-9a-f]{6}|var\(--[a-z-]+\))/i, `${dot} has a colour`);
    assert.match(rule, /--dot-glow:/, `${dot} has a glow`);
  }
});
