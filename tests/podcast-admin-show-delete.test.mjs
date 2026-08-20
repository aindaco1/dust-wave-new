import assert from "node:assert/strict";
import test from "node:test";

import {
  canDeletePodcastShow,
  mountPodcastShowDeletion,
  readShowDeletionPayload,
  showDeletionConfirmation
} from "../src/js/podcast-admin-show-delete.js";

const superAdmin = {
  roles: [{ role: "super_admin", showId: null }]
};
const candidate = {
  id: "show_field_notes",
  slug: "field-notes",
  title: "Field Notes",
  deletionCandidate: true
};

test("limits deletion to Super-admins and API-approved candidates", () => {
  assert.equal(canDeletePodcastShow(superAdmin, candidate), true);
  assert.equal(canDeletePodcastShow({
    roles: [{ role: "admin", showId: null }]
  }, candidate), false);
  assert.equal(canDeletePodcastShow(superAdmin, {
    ...candidate,
    deletionCandidate: false
  }), false);
  assert.equal(canDeletePodcastShow(null, candidate), false);
});

test("builds only the retry id and exact typed confirmation", () => {
  assert.equal(
    showDeletionConfirmation("field-notes"),
    "DELETE_SHOW field-notes"
  );
  assert.deepEqual(readShowDeletionPayload({
    elements: { confirmation: { value: "DELETE_SHOW field-notes" } }
  }, "show_delete_1234567890"), {
    requestId: "show_delete_1234567890",
    confirmation: "DELETE_SHOW field-notes"
  });
});

test("mounts the guarded workflow and deletes the selected candidate", async () => {
  const ui = createWorkflowFixture();
  const requests = [];
  const deleted = [];
  const workflow = mountPodcastShowDeletion({
    root: ui.root,
    client: {
      async request(path, options) {
        requests.push({ path, options });
        return {
          deleted: true,
          show: { id: candidate.id, slug: candidate.slug },
          identityRetired: true
        };
      }
    },
    text(key) {
      return key;
    },
    setStatus(target, message, error = false) {
      target.textContent = message;
      target.error = error;
    },
    friendlyError(error) {
      return error.message;
    },
    async onDeleted(show, result) {
      deleted.push({ show, result });
    }
  });

  assert.equal(ui.section.hidden, true);
  workflow.setIdentity(superAdmin);
  workflow.setShow(candidate);
  assert.equal(ui.section.hidden, false);
  assert.equal(ui.confirmationValue.textContent, "DELETE_SHOW field-notes");

  ui.toggle.emit("click");
  assert.equal(ui.form.hidden, false);
  ui.form.elements.confirmation.value = "DELETE_SHOW field-notes";
  await ui.form.emit("submit", { preventDefault() {} });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/v1/admin/shows/show_field_notes");
  assert.equal(requests[0].options.method, "DELETE");
  assert.match(requests[0].options.body.requestId, /^show_delete_/u);
  assert.equal(
    requests[0].options.body.confirmation,
    "DELETE_SHOW field-notes"
  );
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].show.id, candidate.id);
});

test("rejects an inexact confirmation without calling the API", async () => {
  const ui = createWorkflowFixture();
  let requests = 0;
  const workflow = mountPodcastShowDeletion({
    root: ui.root,
    client: { async request() { requests += 1; } },
    text(key) { return key; },
    setStatus(target, message, error = false) {
      target.textContent = message;
      target.error = error;
    },
    friendlyError(error) { return error.message; },
    async onDeleted() {}
  });
  workflow.setIdentity(superAdmin);
  workflow.setShow(candidate);
  ui.toggle.emit("click");
  ui.form.elements.confirmation.value = "DELETE SHOW field-notes";
  await ui.form.emit("submit", { preventDefault() {} });

  assert.equal(requests, 0);
  assert.equal(ui.status.textContent, "showDeleteConfirmationMismatch");
  assert.equal(ui.status.error, true);
});

function createWorkflowFixture() {
  function eventTarget(properties = {}) {
    const listeners = new Map();
    return {
      ...properties,
      addEventListener(name, listener) {
        listeners.set(name, listener);
      },
      async emit(name, event = {}) {
        return listeners.get(name)?.(event);
      },
      focus() {
        this.focused = true;
      },
      setAttribute(name, value) {
        this[name] = value;
      }
    };
  }
  const confirmation = eventTarget({ value: "" });
  const submit = eventTarget({ disabled: false });
  const form = eventTarget({
    hidden: true,
    elements: { confirmation },
    querySelector() { return submit; },
    reset() { confirmation.value = ""; }
  });
  const section = { hidden: true };
  const toggle = eventTarget();
  const cancel = eventTarget();
  const status = { textContent: "", error: false };
  const confirmationValue = { textContent: "" };
  const nodes = new Map([
    ["[data-podcast-show-delete]", section],
    ["[data-podcast-show-delete-toggle]", toggle],
    ["[data-podcast-show-delete-form]", form],
    ["[data-podcast-show-delete-cancel]", cancel],
    ["[data-podcast-show-delete-status]", status],
    ["[data-podcast-show-delete-confirmation]", confirmationValue]
  ]);
  return {
    confirmationValue,
    form,
    section,
    status,
    submit,
    toggle,
    root: {
      querySelector(selector) {
        return nodes.get(selector) || null;
      }
    }
  };
}
