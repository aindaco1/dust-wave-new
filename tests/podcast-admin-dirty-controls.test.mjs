import assert from "node:assert/strict";
import test from "node:test";

import {
  syncReviewDraftButton
} from "../src/js/podcast-admin-dirty-controls-core.js";
import {
  setDirtyButtonState
} from "../shared/dust-wave-platform/packages/admin-shell/src/dirty-controls.js";

function buttonFixture() {
  const classes = new Set();
  return {
    tagName: "BUTTON",
    classList: {
      contains(name) {
        return classes.has(name);
      },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    },
    dataset: {},
    disabled: false,
    textContent: ""
  };
}

test("uses localized Podcast copy with the shared clean-state policy", () => {
  const button = buttonFixture();
  const text = (key) => key === "saveReviewDraft"
    ? "Guardar borrador de revisión"
    : "";

  syncReviewDraftButton(button, false, text, setDirtyButtonState);

  assert.equal(button.textContent, "Guardar borrador de revisión");
  assert.equal(button.dataset.dirtyState, "clean");
  assert.equal(button.classList.contains("is-dirty"), false);
  assert.equal(button.disabled, true);
});

test("enables and highlights a dirty Podcast review action", () => {
  const button = buttonFixture();

  syncReviewDraftButton(
    button,
    true,
    () => "Save review draft",
    setDirtyButtonState
  );

  assert.equal(button.textContent, "Save review draft");
  assert.equal(button.dataset.dirtyState, "dirty");
  assert.equal(button.classList.contains("is-dirty"), true);
  assert.equal(button.disabled, false);
});
