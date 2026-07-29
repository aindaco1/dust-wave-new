import assert from "node:assert/strict";
import test from "node:test";

import {
  clipDownloadActionMarkup,
  mountTranscriptDownloads
} from "../src/js/podcast-admin-download-actions.js";

test("shares escaped clip download markup", () => {
  const markup = clipDownloadActionMarkup(
    ["https://worker.example/media?name=\"unsafe\"", "", "https://worker.example/captions.srt"],
    (key) => `<${key}>`
  );

  assert.match(markup, /name=&quot;unsafe&quot;/);
  assert.match(markup, /&lt;downloadMp4&gt;/);
  assert.doesNotMatch(markup, /downloadVtt/);
  assert.match(markup, /&lt;downloadSrt&gt;/);
});

test("builds exact saved transcript actions with DOM text", () => {
  const originalDocument = globalThis.document;
  const container = {
    hidden: true,
    children: [],
    replaceChildren(...children) {
      this.children = children;
    }
  };
  globalThis.document = {
    createElement(tagName) {
      assert.equal(tagName, "a");
      return {
        attributes: {},
        setAttribute(name, value) {
          this.attributes[name] = value;
        }
      };
    }
  };
  try {
    const root = {
      dataset: { apiOrigin: "https://worker.example" },
      querySelector(selector) {
        assert.equal(selector, "[data-podcast-transcript-downloads]");
        return container;
      }
    };
    const downloads = mountTranscriptDownloads(root, (key) => `[${key}]`);
    downloads.render("episode_fixture", {
      language: "es",
      revision: 4,
      cues: [{ id: "cue_fixture" }]
    });

    assert.equal(container.hidden, false);
    assert.equal(container.children.length, 2);
    assert.deepEqual(
      container.children.map(({ href }) => href),
      [
        "https://worker.example/v1/admin/episodes/episode_fixture/transcripts/es/captions.vtt",
        "https://worker.example/v1/admin/episodes/episode_fixture/transcripts/es/captions.srt"
      ]
    );
    assert.deepEqual(
      container.children.map(({ textContent }) => textContent),
      [
        "[downloadSavedVtt]",
        "[downloadSavedSrt]"
      ]
    );
    assert.ok(container.children.every(({ attributes }) =>
      attributes.download === ""
    ));

    downloads.render("unsafe/path", {
      language: "es",
      revision: 4,
      cues: [{ id: "cue_fixture" }]
    });
    assert.equal(container.hidden, true);
    assert.deepEqual(container.children, []);
  } finally {
    globalThis.document = originalDocument;
  }
});
