import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const source = await readFile(
  path.resolve(import.meta.dirname, "../src/js/datatype-chart.js"),
  "utf8"
);
const {
  DATATYPE_FONT_PROBE,
  DATATYPE_FONT_SHORTHAND,
  encodeDatatypeLine,
  normalizeDatatypeValues,
  waitForDatatypeFont
} = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("normalizes both analytics series against one explicit maximum", () => {
  assert.deepEqual(
    normalizeDatatypeValues([0, 169, 338], 338),
    [0, 50, 100]
  );
  assert.deepEqual(
    normalizeDatatypeValues([52, 117], 338),
    [15, 35]
  );
});

test("encodes a bounded Datatype line without exposing arbitrary syntax", () => {
  assert.equal(encodeDatatypeLine([0, 50, 100]), "{l:0,50,100}");
  assert.throws(
    () => encodeDatatypeLine([0, 101]),
    /integers from 0 through 100/
  );
  assert.throws(
    () => encodeDatatypeLine(Array.from({ length: 21 }, () => 1)),
    /at most 20 values/
  );
});

test("rejects invalid normalization inputs", () => {
  assert.throws(
    () => normalizeDatatypeValues([], 10),
    /at least one value/
  );
  assert.throws(
    () => normalizeDatatypeValues([1], 0),
    /positive maximum/
  );
  assert.throws(
    () => normalizeDatatypeValues([-1], 10),
    /finite, non-negative numbers/
  );
});

test("reveals charts only after the matching font face is loaded", async () => {
  const calls = [];
  const fontSet = {
    async load(font, probe) {
      calls.push(["load", font, probe]);
      return [{}];
    },
    check(font, probe) {
      calls.push(["check", font, probe]);
      return true;
    }
  };

  assert.equal(await waitForDatatypeFont(fontSet), true);
  assert.deepEqual(calls, [
    ["load", DATATYPE_FONT_SHORTHAND, DATATYPE_FONT_PROBE],
    ["check", DATATYPE_FONT_SHORTHAND, DATATYPE_FONT_PROBE]
  ]);
});

test("keeps charts hidden when the font API is absent or loading fails", async () => {
  assert.equal(await waitForDatatypeFont(undefined), false);
  assert.equal(
    await waitForDatatypeFont({
      async load() {
        throw new Error("network unavailable");
      },
      check() {
        return false;
      }
    }),
    false
  );
});
