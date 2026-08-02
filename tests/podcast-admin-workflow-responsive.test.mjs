import assert from "node:assert/strict";
import test from "node:test";
import {
  workflowOptionLabel
} from "../src/js/podcast-admin-workflow-option-label.js";

function button(title, status) {
  return {
    querySelector(selector) {
      const textContent = selector === "strong" ? title : status;
      return textContent === undefined ? null : { textContent };
    }
  };
}

test("responsive workflow options preserve step and readiness context", () => {
  assert.equal(
    workflowOptionLabel(button(" Details ", " Complete ")),
    "Details — Complete"
  );
  assert.equal(workflowOptionLabel(button("Media", "")), "Media");
  assert.equal(workflowOptionLabel(null), "");
});
