import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBytes,
  formatInteger
} from "../src/js/podcast-admin-formatters.js";

test("integer formatting follows the explicit interface locale", () => {
  assert.equal(formatInteger(1_234_567, "en-US"), "1,234,567");
  assert.equal(formatInteger(1_234_567, "es-ES"), "1.234.567");
});

test("byte formatting localizes decimals without translating standard units", () => {
  assert.equal(formatBytes(1_536, "en-US"), "1.5 KiB");
  assert.equal(formatBytes(1_536, "es-ES"), "1,5 KiB");
  assert.equal(formatBytes(0, "es-ES"), "0 B");
});
