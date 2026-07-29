import assert from "node:assert/strict";
import test from "node:test";

const {
  dollarsToCents
} = await import("../src/js/podcast-admin-show-prices.js");

test("converts exact USD input without floating-point rounding", () => {
  assert.equal(dollarsToCents("5"), 500);
  assert.equal(dollarsToCents("5.5"), 550);
  assert.equal(dollarsToCents("50.00"), 5_000);
  assert.equal(dollarsToCents("10000"), 1_000_000);
});

test("rejects ambiguous, fractional-cent, and out-of-range USD input", () => {
  for (const value of ["", "0.99", "5.001", "1,000", "-5", "10000.01"]) {
    assert.throws(() => dollarsToCents(value));
  }
});
