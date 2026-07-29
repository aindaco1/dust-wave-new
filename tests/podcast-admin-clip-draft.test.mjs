import assert from "node:assert/strict";
import test from "node:test";

import {
  clipDurationLabel,
  mountClipDraftAssistant,
  normalizeClipDraftResponse,
  resolveClipCueRange
} from "../src/js/podcast-admin-clip-draft.js";

const responsePayload = {
  draft: {
    candidates: [
      {
        id: "clip_candidate_111111111111111111111111",
        title: "Apertura vívida",
        reason: "Una historia completa con un gancho claro.",
        startCueId: "cue_001",
        endCueId: "cue_002",
        startsAtMs: 0,
        endsAtMs: 59_000,
        durationMs: 59_000
      },
      {
        id: "clip_candidate_222222222222222222222222",
        title: "La decisión creativa",
        reason: "Una explicación práctica para artistas.",
        startCueId: "cue_003",
        endCueId: "cue_004",
        startsAtMs: 60_000,
        endsAtMs: 119_000,
        durationMs: 59_000
      }
    ]
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

test("accepts only bounded, ordered, review-only clip candidates", () => {
  assert.deepEqual(
    normalizeClipDraftResponse(responsePayload),
    {
      draft: responsePayload.draft,
      source: {
        language: "es",
        revision: 4,
        contentSha256: "a".repeat(64),
        includedCueCount: 12,
        totalCueCount: 12
      },
      outputLanguage: "es"
    }
  );
  assert.throws(() => normalizeClipDraftResponse({
    ...responsePayload,
    saved: true
  }), /evidence is invalid/);
  assert.throws(() => normalizeClipDraftResponse({
    ...responsePayload,
    draft: {
      candidates: [
        responsePayload.draft.candidates[0],
        {
          ...responsePayload.draft.candidates[1],
          startsAtMs: 50_000,
          durationMs: 69_000
        }
      ]
    }
  }), /candidate evidence is invalid/);
  assert.throws(() => normalizeClipDraftResponse({
    ...responsePayload,
    draft: {
      candidates: [{
        ...responsePayload.draft.candidates[0],
        reason: "<img src=x>"
      }]
    }
  }), /candidate reason is invalid/);
});

test("keeps candidates in review until one explicitly fills an unsaved recipe", async () => {
  const fixture = clipDraftFixture();
  const assistant = mountClipDraftAssistant(fixture.options);

  assistant.setEditable(true);
  assistant.setTranscript("episode_fixture", approvedTranscript());
  assert.equal(fixture.root.hidden, false);
  await fixture.controls.generate.dispatch("click");

  assert.deepEqual(fixture.requests, [{
    path: "/v1/admin/episodes/episode_fixture/clips/draft",
    options: {
      method: "POST",
      body: {
        sourceLanguage: "es",
        outputLanguage: "es"
      }
    }
  }]);
  assert.equal(fixture.controls.review.hidden, false);
  assert.equal(fixture.controls.list.children.length, 2);
  assert.equal(fixture.applied.length, 0);
  assert.equal(fixture.statuses.at(-1).text, "clipDraftReady");

  const firstUseButton = fixture.controls.list.children[0].children[3];
  await firstUseButton.dispatch("click");
  assert.deepEqual(fixture.applied, [responsePayload.draft.candidates[0]]);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.statuses.at(-1).text, "clipDraftApplied");
  assert.equal(
    fixture.controls.list.children[0].children[3].disabled,
    true
  );
});

test("rejects stale evidence and protects an existing recipe confirmation", async () => {
  const fixture = clipDraftFixture({
    hasExistingRecipe: () => true,
    confirmReplace: () => false
  });
  const assistant = mountClipDraftAssistant(fixture.options);
  assistant.setEditable(true);
  assistant.setTranscript("episode_fixture", approvedTranscript());
  await fixture.controls.generate.dispatch("click");
  await fixture.controls.list.children[0].children[3].dispatch("click");
  assert.equal(fixture.applied.length, 0);

  assistant.setTranscript("episode_fixture", {
    ...approvedTranscript(),
    contentSha256: "b".repeat(64)
  });
  assert.equal(fixture.controls.review.hidden, true);
});

test("shares deterministic clip range and duration presentation primitives", () => {
  assert.deepEqual(
    resolveClipCueRange([
      { id: "cue_1", startsAtMs: 1_000, endsAtMs: 20_000 },
      { id: "cue_2", startsAtMs: 21_000, endsAtMs: 61_000 }
    ], "cue_1", "cue_2"),
    { startsAtMs: 1_000, endsAtMs: 61_000, durationMs: 60_000 }
  );
  assert.equal(resolveClipCueRange([], "missing", "missing"), null);
  assert.equal(
    clipDurationLabel(59_000, (key, { count }) => `${count} ${key}`, "en"),
    "59 secondsCount"
  );
});

function approvedTranscript() {
  return {
    language: "es",
    status: "approved",
    revision: 4,
    approvedRevision: 4,
    contentSha256: "a".repeat(64)
  };
}

function clipDraftFixture({
  hasExistingRecipe = () => false,
  confirmReplace = () => true
} = {}) {
  const document = new FakeDocument();
  const root = new FakeControl(document);
  const controls = {
    source: new FakeControl(document, "es"),
    output: new FakeControl(document, "es"),
    generate: new FakeControl(document),
    status: new FakeControl(document),
    review: new FakeControl(document),
    evidence: new FakeControl(document),
    list: new FakeControl(document),
    dismiss: new FakeControl(document)
  };
  root.hidden = true;
  root.queries = new Map([
    ["[data-podcast-clip-draft-source-language]", controls.source],
    ["[data-podcast-clip-draft-output-language]", controls.output],
    ["[data-podcast-clip-draft-generate]", controls.generate],
    ["[data-podcast-clip-draft-status]", controls.status],
    ["[data-podcast-clip-draft-review]", controls.review],
    ["[data-podcast-clip-draft-evidence]", controls.evidence],
    ["[data-podcast-clip-draft-list]", controls.list],
    ["[data-podcast-clip-draft-dismiss]", controls.dismiss]
  ]);
  const requests = [];
  const statuses = [];
  const applied = [];
  return {
    root,
    controls,
    requests,
    statuses,
    applied,
    options: {
      root,
      client: {
        async request(path, options) {
          requests.push({ path, options });
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
      hasExistingRecipe,
      applyCandidate(candidate) {
        applied.push(candidate);
      },
      confirmReplace
    }
  };
}

class FakeDocument {
  createElement() {
    return new FakeControl(this);
  }
}

class FakeControl {
  constructor(ownerDocument, value = "") {
    this.ownerDocument = ownerDocument;
    this.value = value;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.listeners = new Map();
    this.queries = new Map();
    this.children = [];
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

  querySelector(selector) {
    return this.queries.get(selector) || null;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}
