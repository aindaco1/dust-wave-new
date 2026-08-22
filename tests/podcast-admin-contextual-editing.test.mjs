import assert from "node:assert/strict";
import test from "node:test";

import {
  applyContextualMarketingLink,
  contextualEditRequest,
  createPodcastDomContextualEditHandlers,
  createPodcastContextualEditHandlers,
  createContextualEditButton,
  mountPodcastContextualEditing,
  renderContextualAnalyticsEpisodes,
  revealContextualEditor
} from "../src/js/podcast-admin-contextual-editing.js";

function documentFixture() {
  return {
    createElement() {
      return {
        attributes: {},
        dataset: {},
        disabled: false,
        setAttribute(name, value) {
          this.attributes[name] = String(value);
        },
        removeAttribute(name) {
          delete this.attributes[name];
        }
      };
    }
  };
}

test("creates one accessible action contract for every contextual editor", () => {
  const button = createContextualEditButton({
    document: documentFixture(),
    type: "clip",
    id: "clip_exact",
    parentId: "episode_exact",
    label: "Edit recipe",
    accessibleLabel: "Edit clip recipe: Opening"
  });

  assert.equal(button.type, "button");
  assert.equal(button.dataset.podcastContextEdit, "clip");
  assert.equal(button.dataset.podcastContextId, "clip_exact");
  assert.equal(button.dataset.podcastContextParentId, "episode_exact");
  assert.equal(button.textContent, "Edit recipe");
  assert.equal(button.attributes["aria-label"], "Edit clip recipe: Opening");
});

test("resolves only exact supported actions inside the mounted Admin", () => {
  const button = createContextualEditButton({
    document: documentFixture(),
    type: "episode",
    id: "episode_one",
    label: "Edit episode"
  });
  button.closest = () => button;
  const root = { contains: (candidate) => candidate === button };

  assert.deepEqual(contextualEditRequest(button, root), {
    button,
    type: "episode",
    id: "episode_one",
    parentId: ""
  });
  button.dataset.podcastContextEdit = "delete";
  assert.equal(contextualEditRequest(button, root), null);
});

test("delegates actions once and locks the trigger while navigation runs", async () => {
  const listeners = new Map();
  const root = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
    contains() { return true; }
  };
  const button = createContextualEditButton({
    document: documentFixture(),
    type: "show",
    id: "show_one",
    label: "Edit show"
  });
  button.closest = () => button;
  let release;
  const navigated = new Promise((resolve) => { release = resolve; });
  const requests = [];
  const mounted = mountPodcastContextualEditing({
    root,
    handlers: {
      show(request) {
        requests.push(request.id);
        return navigated;
      }
    }
  });
  const event = {
    target: button,
    prevented: false,
    preventDefault() { this.prevented = true; }
  };

  const pending = listeners.get("click")(event);
  assert.equal(event.prevented, true);
  assert.equal(button.disabled, true);
  assert.equal(button.attributes["aria-busy"], "true");
  assert.deepEqual(requests, ["show_one"]);

  release();
  await pending;
  assert.equal(button.disabled, false);
  assert.equal(button.attributes["aria-busy"], undefined);

  mounted.destroy();
  assert.equal(listeners.has("click"), false);
});

test("reveals the canonical editor without duplicating its form", () => {
  const calls = [];
  const container = {
    scrollIntoView(options) { calls.push(["scroll", options]); }
  };
  const field = {
    focus(options) { calls.push(["focus", options]); }
  };

  revealContextualEditor(container, field, {
    behavior: "smooth",
    block: "nearest"
  });
  assert.deepEqual(calls, [
    ["scroll", { block: "nearest", behavior: "smooth" }],
    ["focus", undefined]
  ]);
});

test("shared handlers preserve show guards and route entities exactly", async () => {
  const calls = [];
  let allowShowChange = false;
  const titleField = { focus() { calls.push("focus-title"); } };
  const showForm = {
    elements: { title: titleField },
    scrollIntoView() { calls.push("show-form"); }
  };
  const episodeForm = {
    elements: { title: titleField },
    scrollIntoView() { calls.push("episode-form"); }
  };
  const showSelect = {
    ownerDocument: { defaultView: { Event: class { constructor(type) {
      this.type = type;
    } } } },
    value: "show_one",
    dispatchEvent() {
      calls.push(`select-show:${this.value}`);
      return allowShowChange;
    }
  };
  const handlers = createPodcastContextualEditHandlers({
    permissions: { show: () => true, episode: () => true, clip: () => true },
    tabs: { select: (name) => calls.push(`tab:${name}`) },
    showSelect,
    getSelectedShowId: () => "show_one",
    getShows: () => [{ id: "show_one" }, { id: "show_two" }],
    showForm,
    getEpisodes: () => [{ id: "episode_one" }],
    episodeForm,
    selectEpisode(id) { calls.push(`select-episode:${id}`); return true; },
    navigateEpisode(...args) {
      calls.push(`navigate:${args[0]}:${args[1].id}:${args[2] || ""}`);
    },
    getClips: () => [{ id: "clip_one", episodeId: "episode_one" }],
    async loadTranscript() { calls.push("load-transcript"); },
    selectClipRecipe(id) { calls.push(`select-clip:${id}`); return true; }
  });

  assert.equal(handlers.show({ id: "show_two" }), false);
  assert.deepEqual(calls, ["select-show:show_two"]);

  calls.length = 0;
  allowShowChange = true;
  assert.equal(handlers.show({ id: "show_two" }), true);
  assert.deepEqual(calls.slice(0, 2), ["select-show:show_two", "tab:settings"]);

  calls.length = 0;
  assert.equal(handlers.episode({ id: "episode_one" }), true);
  assert.deepEqual(calls.slice(0, 2), [
    "select-episode:episode_one",
    "navigate:details:episode_one:"
  ]);

  calls.length = 0;
  assert.equal(await handlers.clip({
    id: "clip_one",
    parentId: "episode_one"
  }), true);
  assert.deepEqual(calls, [
    "select-episode:episode_one",
    "navigate:review:episode_one:promotion_clips",
    "load-transcript",
    "select-clip:clip_one"
  ]);
});

test("saved-link and analytics surfaces reuse the shared contextual contract", () => {
  const fields = Object.fromEntries([
    "label", "source", "medium", "campaign", "content", "ref"
  ].map((name) => [name, { value: "" }]));
  const form = {
    elements: fields,
    scrollIntoView() {}
  };
  let changed = 0;
  applyContextualMarketingLink(form, {
    label: "Festival",
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "launch",
    utmContent: "hero",
    referralCode: "partner"
  }, { onChange() { changed += 1; } });
  assert.deepEqual(
    Object.fromEntries(Object.entries(fields).map(([key, field]) => [
      key,
      field.value
    ])),
    {
      label: "Festival",
      source: "newsletter",
      medium: "email",
      campaign: "launch",
      content: "hero",
      ref: "partner"
    }
  );
  assert.equal(changed, 1);

  let model;
  const tableNode = {};
  const target = {
    ownerDocument: documentFixture(),
    replaceChildren(value) { this.child = value; }
  };
  renderContextualAnalyticsEpisodes({
    target,
    rows: [{
      episodeId: "episode_exact",
      title: "Episode exact",
      qualifiedDownloads: 12,
      engagedPlays: 4
    }],
    text: (key) => key,
    formatInteger: String,
    canEdit: () => true,
    table(headings, rows) {
      model = { headings, rows };
      return tableNode;
    },
    empty: (message) => message
  });
  assert.equal(target.child, tableNode);
  assert.deepEqual(model.headings, [
    "analyticsEpisode",
    "analyticsQualifiedShort",
    "analyticsEngagedShort",
    "actionsLabel"
  ]);
  assert.equal(model.rows[0][3].dataset.podcastContextEdit, "episode");
  assert.equal(model.rows[0][3].dataset.podcastContextId, "episode_exact");
});

test("DOM handlers do not re-dispatch an already selected show", () => {
  const calls = [];
  const showSelect = {
    value: "show_one",
    options: [{ value: "show_one" }],
    dispatchEvent() { calls.push("change"); return true; }
  };
  const showForm = {
    elements: { title: { focus() { calls.push("focus"); } } },
    scrollIntoView() { calls.push("scroll"); }
  };
  const settingsTab = { click() { calls.push("settings"); } };
  const root = {
    querySelector(selector) {
      if (selector.includes("data-podcast-show-select")) return showSelect;
      if (selector.includes('data-tab="settings"')) return settingsTab;
      if (selector === "[data-podcast-show-form]") return showForm;
      return null;
    }
  };

  const handlers = createPodcastDomContextualEditHandlers(root);
  assert.equal(handlers.show({ id: "show_one" }), true);
  assert.deepEqual(calls, ["settings", "scroll", "focus"]);
});
