import assert from "node:assert/strict";
import test from "node:test";

import {
  appendDefinition,
  createEmptyAdminMessage,
  setElementStatus
} from "../src/js/podcast-admin-dom.js";

function documentFixture() {
  return {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        textContent: ""
      };
    }
  };
}

test("definition rows keep their label and value paired", () => {
  const ownerDocument = documentFixture();
  const list = {
    ownerDocument,
    children: [],
    append(...children) {
      this.children.push(...children);
    }
  };

  appendDefinition(list, "Status", "Ready");

  assert.deepEqual(list.children, [
    { tagName: "dt", className: "", textContent: "Status" },
    { tagName: "dd", className: "", textContent: "Ready" }
  ]);
});

test("empty-state and status elements share the admin presentation contract", () => {
  const message = createEmptyAdminMessage("Nothing yet", documentFixture());
  const toggles = [];
  const status = {
    textContent: "",
    classList: {
      toggle(name, active) {
        toggles.push([name, active]);
      }
    }
  };

  setElementStatus(status, "Try again", true);

  assert.equal(message.className, "podcast-admin__empty");
  assert.equal(message.textContent, "Nothing yet");
  assert.equal(status.textContent, "Try again");
  assert.deepEqual(toggles, [["is-error", true]]);
  assert.doesNotThrow(() => setElementStatus(null, "ignored"));
});
