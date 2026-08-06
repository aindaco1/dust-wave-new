import assert from "node:assert/strict";
import test from "node:test";

import {
  mountChapterDraftAssistant,
  normalizeChapterDraftCollection,
  normalizeChapterDraftResponse
} from "../src/js/podcast-admin-chapter-draft.js";

const responsePayload = {
  draft: {
    chapters: [
      {
        id: "chapter_ai_111111111111111111111111",
        startsAtMs: 0,
        title: "Apertura",
        url: "",
        imageUrl: "",
        toc: true
      },
      {
        id: "chapter_ai_222222222222222222222222",
        startsAtMs: 75_000,
        title: "Proceso creativo",
        url: "",
        imageUrl: "",
        toc: true
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

test("accepts only complete, bounded, review-only chapter proposals", () => {
  assert.deepEqual(
    normalizeChapterDraftResponse(responsePayload),
    {
      draft: responsePayload.draft,
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
    }
  );
  assert.throws(() => normalizeChapterDraftResponse({
    ...responsePayload,
    saved: true
  }), /evidence is invalid/);
  assert.throws(() => normalizeChapterDraftResponse({
    ...responsePayload,
    source: {
      ...responsePayload.source,
      includedCueCount: 8,
      truncated: true
    }
  }), /evidence is invalid/);
  assert.throws(() => normalizeChapterDraftResponse({
    ...responsePayload,
    draft: {
      chapters: [{
        ...responsePayload.draft.chapters[0],
        title: "<img src=x>"
      }]
    }
  }), /title is invalid/);
});

test("accepts only alignment-pinned saved proposal collections", () => {
  const saved = {
    ...responsePayload,
    id: "editorial_chapter_draft_fixture",
    source: {
      ...responsePayload.source,
      alignmentRevisionId: "alignment_revision_fixture"
    },
    draftSha256: "b".repeat(64),
    completedAt: "2026-07-30 10:05:00",
    saved: true
  };
  const [normalized] = normalizeChapterDraftCollection({
    episodeId: "episode_fixture",
    drafts: [saved]
  });
  assert.equal(normalized.saved, true);
  assert.equal(
    normalized.source.alignmentRevisionId,
    "alignment_revision_fixture"
  );
  assert.throws(() => normalizeChapterDraftCollection({
    episodeId: "episode_fixture",
    drafts: [{ ...saved, source: responsePayload.source }]
  }), /evidence is invalid/);
});

test("keeps generated chapters in review until explicit unsaved application", async () => {
  const fixture = chapterDraftFixture();
  const assistant = mountChapterDraftAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");
  assert.equal(fixture.root.hidden, false);
  await fixture.controls.generate.dispatch("click");

  assert.deepEqual(fixture.requests, [
    {
      path: "/v1/admin/episodes/episode_fixture/chapters/drafts",
      options: undefined
    },
    {
      path: "/v1/admin/episodes/episode_fixture/chapters/draft",
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
  assert.equal(fixture.controls.list.children.length, 2);
  assert.equal(fixture.applied.length, 0);
  assert.equal(fixture.statuses.at(-1).text, "chapterDraftReady");

  await fixture.controls.apply.dispatch("click");
  assert.deepEqual(fixture.applied, [responsePayload.draft.chapters]);
  assert.equal(fixture.requests.length, 2);
  assert.equal(fixture.statuses.at(-1).text, "chapterDraftApplied");
  assert.equal(fixture.controls.apply.disabled, true);
});

test("does not replace existing chapter work without confirmation", async () => {
  const fixture = chapterDraftFixture({
    hasExistingChapters: () => true,
    confirmReplace: () => false
  });
  const assistant = mountChapterDraftAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");
  await fixture.controls.generate.dispatch("click");
  await fixture.controls.apply.dispatch("click");

  assert.equal(fixture.applied.length, 0);
});

test("loads an automatic proposal without applying or saving it", async () => {
  const saved = {
    ...responsePayload,
    id: "editorial_chapter_draft_fixture",
    source: {
      ...responsePayload.source,
      alignmentRevisionId: "alignment_revision_fixture"
    },
    draftSha256: "b".repeat(64),
    completedAt: "2026-07-30 10:05:00",
    saved: true
  };
  const fixture = chapterDraftFixture({ automaticDrafts: [saved] });
  const assistant = mountChapterDraftAssistant(fixture.options);

  assistant.setEditable(true);
  await assistant.setEpisode("episode_fixture", "es");

  assert.equal(fixture.controls.review.hidden, false);
  assert.equal(fixture.controls.list.children.length, 2);
  assert.equal(fixture.applied.length, 0);
  assert.equal(fixture.statuses.at(-1).text, "chapterDraftAutomaticReady");
  assert.deepEqual(fixture.requests, [{
    path: "/v1/admin/episodes/episode_fixture/chapters/drafts",
    options: undefined
  }]);
});

function chapterDraftFixture({
  automaticDrafts = [],
  hasExistingChapters = () => false,
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
    apply: new FakeControl(document),
    dismiss: new FakeControl(document)
  };
  root.hidden = true;
  root.queries = new Map([
    ["[data-podcast-chapter-draft-source-language]", controls.source],
    ["[data-podcast-chapter-draft-output-language]", controls.output],
    ["[data-podcast-chapter-draft-generate]", controls.generate],
    ["[data-podcast-chapter-draft-status]", controls.status],
    ["[data-podcast-chapter-draft-review]", controls.review],
    ["[data-podcast-chapter-draft-evidence]", controls.evidence],
    ["[data-podcast-chapter-draft-list]", controls.list],
    ["[data-podcast-chapter-draft-apply]", controls.apply],
    ["[data-podcast-chapter-draft-dismiss]", controls.dismiss]
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
          if (path.endsWith("/chapters/drafts")) {
            return structuredClone({
              episodeId: "episode_fixture",
              drafts: automaticDrafts
            });
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
      hasExistingChapters,
      applyChapters(chapters) {
        applied.push(chapters);
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
