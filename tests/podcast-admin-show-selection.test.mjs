import assert from "node:assert/strict";
import test from "node:test";

import {
  createPodcastShowSelection
} from "../src/js/podcast-admin-show-selection.js";

function fixture() {
  const values = new Map();
  return {
    values,
    selection: createPodcastShowSelection({
      getItem: (key) => values.get(key) || null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value)
    })
  };
}

test("remembers and restores an available show", () => {
  const { selection } = fixture();
  assert.equal(selection.remember("show-two"), true);
  assert.equal(selection.read([
    { id: "show-one" },
    { id: "show-two" }
  ]), "show-two");
});

test("does not restore a show the current identity cannot access", () => {
  const { selection } = fixture();
  selection.remember("show-private");
  assert.equal(selection.read([{ id: "show-public" }]), "");
});

test("fails closed when browser storage is unavailable", () => {
  const selection = createPodcastShowSelection(() => {
    throw new Error("storage unavailable");
  });
  assert.equal(selection.read([{ id: "show-one" }]), "");
  assert.equal(selection.remember("show-one"), true);
});
