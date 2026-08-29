import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBytes,
  formatInteger,
  formatLocalizedNumber,
  formatWholeSecondTimestamp
} from "../src/js/podcast-admin-formatters.js";

test("integer formatting follows the explicit interface locale", () => {
  assert.equal(formatInteger(1_234_567, "en-US"), "1,234,567");
  assert.equal(formatInteger(1_234_567, "es-ES"), "1.234.567");
  assert.equal(formatLocalizedNumber(-12, "en-US"), "-12");
  assert.equal(formatLocalizedNumber(null, "en-US"), "0");
});

test("byte formatting localizes decimals without translating standard units", () => {
  assert.equal(formatBytes(1_536, "en-US"), "1.5 KiB");
  assert.equal(formatBytes(1_536, "es-ES"), "1,5 KiB");
  assert.equal(formatBytes(0, "es-ES"), "0 B");
});

test("whole-second timestamps are shared by chapter and clip previews", () => {
  assert.equal(formatWholeSecondTimestamp(0), "0:00");
  assert.equal(formatWholeSecondTimestamp(3_716_060), "1:01:56");
  assert.equal(formatWholeSecondTimestamp(-1), "0:00");
  assert.equal(formatWholeSecondTimestamp("invalid"), "0:00");
});
