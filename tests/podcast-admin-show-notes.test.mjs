import assert from "node:assert/strict";
import test from "node:test";

import {
  mountShowNotesAssistant,
  normalizeShowNotesDraftCollection,
  normalizeShowNotesDraftResponse
} from "../src/js/podcast-admin-show-notes.js";

const responsePayload = {
  draft: {
    summary: "Resumen sugerido.",
    showNotesMarkdown: "## Temas\n\n- Evidencia revisada",
    keywords: ["Cine", "Selva"]
  },
  source: {
    language: "es",
    revision: 4,
    contentSha256: "a".repeat(64),
    includedCueCount: 12,
    totalCueCount: 12,
    truncated: false
  },
  outputLanguage: "es",
  reviewRequired: true,
  saved: false
};

test("accepts only bounded, review-only responses with exact evidence", () => {
  assert.deepEqual(
    normalizeShowNotesDraftResponse(responsePayload),
    {
      draft: responsePayload.draft,
      source: {
        language: "es",
        revision: 4,
        includedCueCount: 12,
        totalCueCount: 12,
        truncated: false
      },
      outputLanguage: "es",
      saved: false,
      id: "",
      completedAt: ""
    }
  );
  assert.equal(normalizeShowNotesDraftResponse({
    ...responsePayload,
    saved: true
  }).saved, true);
  assert.equal(normalizeShowNotesDraftCollection({
    drafts: [{ ...responsePayload, saved: true }]
  }).length, 1);
  assert.throws(() => normalizeShowNotesDraftResponse({
    ...responsePayload,
    source: {
      ...responsePayload.source,
      contentSha256: "not-a-digest"
    }
  }), /evidence is invalid/);
  assert.throws(() => normalizeShowNotesDraftResponse({
    ...responsePayload,
    draft: {
      ...responsePayload.draft,
      showNotesMarkdown: "\u202edirection override"
    }
  }), /showNotesMarkdown is invalid/);
});

test("reviews a generated draft before placing it in the unsaved editor", async () => {
  const fixture = showNotesFixture();
  const assistant = mountShowNotesAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");
  assert.equal(fixture.root.hidden, false);
  await fixture.controls.generate.dispatch("click");

  assert.deepEqual(fixture.requests, [
    {
      path: "/v1/admin/episodes/episode_fixture/show-notes/drafts",
      options: undefined
    },
    {
      path: "/v1/admin/episodes/episode_fixture/show-notes/draft",
      options: {
        method: "POST",
        body: {
          sourceLanguage: "es",
          outputLanguage: "es"
        }
      }
    }
  ]);
  assert.equal(fixture.controls.review.hidden, false);
  assert.equal(
    fixture.controls.draft.textContent,
    responsePayload.draft.showNotesMarkdown
  );
  assert.equal(fixture.notesEditor.value, "");
  assert.equal(fixture.statuses.at(-1).text, "showNotesReady");

  await fixture.controls.apply.dispatch("click");
  assert.equal(
    fixture.notesEditor.value,
    responsePayload.draft.showNotesMarkdown
  );
  assert.equal(fixture.notesEditor.focused, true);
  assert.equal(fixture.requests.length, 2);
  assert.equal(fixture.statuses.at(-1).text, "showNotesApplied");
});

test("does not replace existing notes without explicit confirmation", async () => {
  const fixture = showNotesFixture({
    existingMarkdown: "Producer notes",
    confirmReplace: () => false
  });
  const assistant = mountShowNotesAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");
  await fixture.controls.generate.dispatch("click");
  await fixture.controls.apply.dispatch("click");

  assert.equal(fixture.notesEditor.value, "");
  assert.equal(fixture.notesEditor.existingMarkdown, "Producer notes");
});

test("loads a saved automatic draft without changing episode notes", async () => {
  const automaticDraft = {
    ...responsePayload,
    id: "editorial_draft_fixture",
    saved: true,
    completedAt: "2026-07-30 10:05:00"
  };
  const fixture = showNotesFixture({ automaticDraft });
  const assistant = mountShowNotesAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");

  assert.equal(fixture.controls.review.hidden, false);
  assert.equal(
    fixture.controls.draft.textContent,
    responsePayload.draft.showNotesMarkdown
  );
  assert.equal(fixture.notesEditor.value, "");
  assert.equal(fixture.statuses.at(-1).text, "showNotesAutomaticReady");
});

function showNotesFixture({
  existingMarkdown = "",
  confirmReplace = () => true,
  automaticDraft = null
} = {}) {
  const root = new FakeControl();
  const controls = {
    source: new FakeControl("es"),
    output: new FakeControl("es"),
    generate: new FakeControl(),
    status: new FakeControl(),
    review: new FakeControl(),
    evidence: new FakeControl(),
    summary: new FakeControl(),
    draft: new FakeControl(),
    keywords: new FakeControl(),
    apply: new FakeControl(),
    dismiss: new FakeControl()
  };
  root.hidden = true;
  root.queries = new Map([
    ["[data-podcast-show-notes-source-language]", controls.source],
    ["[data-podcast-show-notes-output-language]", controls.output],
    ["[data-podcast-show-notes-generate]", controls.generate],
    ["[data-podcast-show-notes-status]", controls.status],
    ["[data-podcast-show-notes-review]", controls.review],
    ["[data-podcast-show-notes-evidence]", controls.evidence],
    ["[data-podcast-show-notes-summary]", controls.summary],
    ["[data-podcast-show-notes-draft]", controls.draft],
    ["[data-podcast-show-notes-keywords]", controls.keywords],
    ["[data-podcast-show-notes-apply]", controls.apply],
    ["[data-podcast-show-notes-dismiss]", controls.dismiss]
  ]);
  const requests = [];
  const statuses = [];
  const notesEditor = {
    existingMarkdown,
    value: "",
    focused: false,
    getMarkdown() {
      return this.existingMarkdown || this.value;
    },
    setValue(value) {
      this.existingMarkdown = "";
      this.value = value;
    },
    focus() {
      this.focused = true;
    }
  };
  return {
    root,
    controls,
    requests,
    statuses,
    notesEditor,
    options: {
      root,
      notesEditor,
      client: {
        async request(path, options) {
          requests.push({ path, options });
          if (path.endsWith("/show-notes/drafts")) {
            return {
              episodeId: "episode_fixture",
              drafts: automaticDraft ? [structuredClone(automaticDraft)] : []
            };
          }
          return structuredClone(responsePayload);
        }
      },
      text(key, variables = {}) {
        return Object.entries(variables).reduce(
          (value, [name, replacement]) =>
            value.replace(`%{${name}}`, String(replacement)),
          key
        );
      },
      setStatus(control, value, error = false) {
        control.textContent = value;
        statuses.push({ text: value, error });
      },
      friendlyError(error) {
        return error.message;
      },
      confirmReplace
    }
  };
}

class FakeControl {
  constructor(value = "") {
    this.value = value;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.listeners = new Map();
    this.queries = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async dispatch(type) {
    for (const listener of this.listeners.get(type) || []) {
      await listener({ currentTarget: this });
    }
  }

  focus() {
    this.focused = true;
  }

  querySelector(selector) {
    return this.queries.get(selector) || null;
  }
}
