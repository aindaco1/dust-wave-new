import assert from "node:assert/strict";
import test from "node:test";
import {
  podcastAdminSectionModels
} from "../src/js/podcast-admin-section-tabs.js";

function panel(label, value = "") {
  return {
    dataset: value ? { podcastWorkspaceGroup: value } : {},
    ownerDocument: {},
    querySelector(selector) {
      assert.match(selector, /summary/);
      return { textContent: label };
    }
  };
}

test("workspace subsection models preserve labels, order, and stable values", () => {
  const models = podcastAdminSectionModels([
    panel(" Analytics ", "analytics"),
    panel("Subscribers", "subscribers"),
    panel("Episode announcements")
  ]);

  assert.deepEqual(
    models.map(({ index, label, value }) => ({ index, label, value })),
    [
      { index: 0, label: "Analytics", value: "analytics" },
      { index: 1, label: "Subscribers", value: "subscribers" },
      { index: 2, label: "Episode announcements", value: "section-3" }
    ]
  );
});

test("workspace subsection models reject unavailable or unnamed panels", () => {
  assert.deepEqual(podcastAdminSectionModels([
    null,
    { ownerDocument: {}, dataset: {}, querySelector: () => null },
    { ownerDocument: null, dataset: {}, querySelector: () => ({ textContent: "Hidden" }) }
  ]), []);
});
