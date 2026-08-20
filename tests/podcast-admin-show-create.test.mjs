import assert from "node:assert/strict";
import test from "node:test";

import {
  canCreatePodcastShow,
  mountPodcastShowCreator,
  permanentShowDestinations,
  readShowCreationPayload,
  showCreationConfirmation,
  showSlugFromTitle
} from "../src/js/podcast-admin-show-create.js";

test("derives a stable URL-safe show identity", () => {
  assert.equal(showSlugFromTitle("Ópera & Field Notes!"), "opera-field-notes");
  assert.equal(
    showCreationConfirmation("opera-field-notes"),
    "CREATE_SHOW opera-field-notes"
  );
  assert.deepEqual(permanentShowDestinations("opera-field-notes"), {
    canonicalUrl: "https://dustwave.xyz/podcasts/opera-field-notes/",
    feedUrl: "https://feeds.dustwave.xyz/opera-field-notes/rss.xml"
  });
});

test("builds the POST body without publish or premium switches", () => {
  const payload = readShowCreationPayload(fixtureForm(), "show_create_1234567890");

  assert.deepEqual(payload, {
    requestId: "show_create_1234567890",
    title: "Field Notes",
    slug: "field-notes",
    language: "en",
    authorName: "Dust Wave",
    category: "Arts",
    description: "Notas de campo.",
    descriptionEn: "Field notes.",
    artworkUrl: "",
    earlyAccessDays: null,
    youtubeChannelUrl: "",
    explicit: false,
    confirmation: "CREATE_SHOW field-notes"
  });
  assert.equal("status" in payload, false);
  assert.equal("premiumEnabled" in payload, false);
  assert.equal("freeMiniEpisodeEnabled" in payload, false);
});

test("exposes show creation only to Super-admin identities", () => {
  assert.equal(canCreatePodcastShow({
    roles: [{ role: "super_admin", showId: null }]
  }), true);
  assert.equal(canCreatePodcastShow({
    roles: [{ role: "admin", showId: null }]
  }), false);
  assert.equal(canCreatePodcastShow(null), false);
});

test("mounts the guarded form, derives previews, and selects the created show", async () => {
  const ui = createWorkflowFixture();
  const requests = [];
  const created = [];
  const creator = mountPodcastShowCreator({
    root: ui.root,
    client: {
      async request(path, options) {
        requests.push({ path, options });
        return { show: { id: "show_field_notes", title: "Field Notes" } };
      }
    },
    text(key, variables = {}) {
      return key === "showCreated" ? `Created ${variables.title}` : key;
    },
    setStatus(target, message, error = false) {
      target.textContent = message;
      target.error = error;
    },
    friendlyError(error) {
      return error.message;
    },
    async onCreated(show) {
      created.push(show);
    }
  });

  assert.equal(ui.toggle.hidden, true);
  creator.setIdentity({ roles: [{ role: "super_admin", showId: null }] });
  assert.equal(ui.toggle.hidden, false);
  ui.toggle.emit("click");
  assert.equal(ui.panel.hidden, false);

  ui.form.elements.title.value = "Field Notes";
  ui.form.elements.title.emit("input");
  assert.equal(ui.form.elements.slug.value, "field-notes");
  assert.equal(
    ui.form.elements.feedUrl.value,
    "https://feeds.dustwave.xyz/field-notes/rss.xml"
  );
  assert.equal(ui.confirmationValue.textContent, "CREATE_SHOW field-notes");
  ui.form.elements.confirmation.value = "CREATE_SHOW field-notes";
  await ui.form.emit("submit", { preventDefault() {} });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/v1/admin/shows");
  assert.equal(requests[0].options.method, "POST");
  assert.match(requests[0].options.body.requestId, /^show_create_/u);
  assert.equal(requests[0].options.body.slug, "field-notes");
  assert.deepEqual(created, [{ id: "show_field_notes", title: "Field Notes" }]);
  assert.equal(ui.status.textContent, "Created Field Notes");
});

function fixtureForm() {
  const values = {
    title: "Field Notes",
    slug: "field-notes",
    language: "en",
    authorName: "Dust Wave",
    category: "Arts",
    description: "Notas de campo.",
    descriptionEn: "Field notes.",
    artworkUrl: "",
    earlyAccessDays: "",
    youtubeChannelUrl: "",
    confirmation: "CREATE_SHOW field-notes"
  };
  return {
    elements: {
      ...Object.fromEntries(Object.entries(values).map(([name, value]) => [
        name,
        { value }
      ])),
      explicit: { checked: false }
    }
  };
}

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
  const names = [
    "title",
    "slug",
    "language",
    "authorName",
    "category",
    "description",
    "descriptionEn",
    "artworkUrl",
    "earlyAccessDays",
    "youtubeChannelUrl",
    "confirmation",
    "canonicalUrl",
    "feedUrl"
  ];
  const elements = Object.fromEntries(names.map((name) => [
    name,
    eventTarget({ value: "" })
  ]));
  elements.explicit = eventTarget({ checked: false });
  const submit = eventTarget({ disabled: false });
  const form = eventTarget({
    elements,
    querySelector() {
      return submit;
    },
    reset() {
      for (const element of Object.values(elements)) {
        if ("value" in element) element.value = "";
        if ("checked" in element) element.checked = false;
      }
    }
  });
  const toggle = eventTarget({ hidden: true });
  const panel = { hidden: true };
  const cancel = eventTarget();
  const status = { textContent: "", error: false };
  const confirmationValue = { textContent: "" };
  const nodes = new Map([
    ["[data-podcast-show-create-toggle]", toggle],
    ["[data-podcast-show-create-panel]", panel],
    ["[data-podcast-show-create-form]", form],
    ["[data-podcast-show-create-cancel]", cancel],
    ["[data-podcast-show-create-status]", status],
    ["[data-podcast-show-create-confirmation]", confirmationValue]
  ]);
  return {
    cancel,
    confirmationValue,
    form,
    panel,
    status,
    submit,
    toggle,
    root: {
      ownerDocument: { documentElement: { lang: "en" } },
      querySelector(selector) {
        return nodes.get(selector) || null;
      }
    }
  };
}
