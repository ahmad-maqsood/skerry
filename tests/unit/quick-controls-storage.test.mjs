import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLastReadings } from "../../src/features/quick-controls/storage.ts";

test("stored readings are kept as whole percentages and bad data falls back to nothing", () => {
  assert.deepEqual(normalizeLastReadings({ volume: 32.4, brightness: 46 }), { volume: 32, brightness: 46 });
  assert.deepEqual(normalizeLastReadings({ volume: 250, brightness: -3 }), { volume: 100, brightness: 0 });
  assert.deepEqual(normalizeLastReadings({ volume: "loud", brightness: null }), { volume: null, brightness: null });
  assert.deepEqual(normalizeLastReadings(undefined), { volume: null, brightness: null });
  assert.deepEqual(normalizeLastReadings("x"), { volume: null, brightness: null });
});
