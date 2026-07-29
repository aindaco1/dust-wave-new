import assert from "node:assert/strict";
import test from "node:test";

import {
  renderClipLayoutPreview,
  renderClipRecipePreview
} from "../src/js/podcast-admin-clip-preview.js";

test("renders the existing captioned-waveform contract without HTML sinks", () => {
  const target = new FakeNode("div");
  renderClipLayoutPreview({
    target,
    aspectRatio: "9:16",
    selection: {
      startsAtMs: 15_000,
      endsAtMs: 74_000,
      durationMs: 59_000
    },
    caption: "<img src=x> sigue siendo texto",
    text: translatedText,
    formatTimestamp: (value) => value === 15_000 ? "0:15" : "1:14",
    formatDuration: () => "59 seconds"
  });

  assert.equal(target.dataset.state, "ready");
  assert.equal(target.dataset.aspectRatio, "9:16");
  const stage = findNode(
    target,
    (node) => node.className === "podcast-admin__clip-preview-stage"
  );
  assert.equal(stage.dataset.aspectRatio, "9:16");
  const caption = findNode(
    target,
    (node) => node.className === "podcast-admin__clip-preview-caption"
  );
  assert.equal(caption.textContent, "<img src=x> sigue siendo texto");
  const waveform = findNode(
    target,
    (node) => node.className === "podcast-admin__clip-preview-waveform"
  );
  assert.equal(waveform.children.length, 18);
  const evidence = findNode(
    target,
    (node) => node.textContent.includes("0:15–1:14")
  );
  assert.equal(
    evidence.textContent,
    "0:15–1:14 · 59 seconds · 1080×1920"
  );
});

test("localizes blocked state and normalizes an unsupported aspect ratio", () => {
  const target = new FakeNode("div");
  renderClipLayoutPreview({
    target,
    message: "Aprueba la transcripción.",
    text: translatedText,
    formatTimestamp: String,
    formatDuration: String
  });
  assert.equal(target.dataset.state, "unavailable");
  assert.equal(target.textContent, "Aprueba la transcripción.");
  assert.equal(target.children.length, 0);

  renderClipLayoutPreview({
    target,
    aspectRatio: "unsupported",
    selection: {
      startsAtMs: 0,
      endsAtMs: 1_000,
      durationMs: 1_000
    },
    caption: "",
    text: translatedText,
    formatTimestamp: () => "0:00",
    formatDuration: () => "1 second"
  });
  assert.equal(target.dataset.aspectRatio, "9:16");
  assert(findNode(
    target,
    (node) => node.textContent === "Approved captions appear here"
  ));
});

test("shows only current approved transcript evidence in a recipe preview", () => {
  const target = new FakeNode("div");
  const common = {
    target,
    aspectRatio: "1:1",
    selection: {
      startsAtMs: 0,
      endsAtMs: 30_000,
      durationMs: 30_000
    },
    startCue: {
      speakerLabel: "Jay",
      speakerConfirmed: true,
      textMarkdown: "**Hola** <img src=x>"
    },
    text: translatedText,
    formatTimestamp: () => "0:00",
    formatDuration: () => "30 seconds"
  };
  renderClipRecipePreview({
    ...common,
    transcript: {
      status: "needs_review",
      revision: 2,
      approvedRevision: null
    },
    transcriptDirty: false
  });
  assert.equal(target.dataset.state, "unavailable");
  assert.equal(target.textContent, "Approve transcript");

  renderClipRecipePreview({
    ...common,
    transcript: {
      status: "approved",
      revision: 2,
      approvedRevision: 2
    },
    transcriptDirty: false
  });
  assert.equal(target.dataset.state, "ready");
  assert.equal(target.dataset.aspectRatio, "1:1");
  assert(findNode(
    target,
    (node) => node.textContent === "Jay: Hola"
  ));
});

function translatedText(key, variables = {}) {
  const values = {
    clipSafeAreaLabel: "Safe area",
    clipCaptionPreviewPlaceholder: "Approved captions appear here",
    clipLayoutPreview: "Responsive layout preview",
    clipLayoutPreviewEvidence:
      "%{start}–%{end} · %{duration} · %{dimensions}",
    clipLayoutPreviewNotice: "layout only",
    highContrastCaptions: "high-contrast captions",
    captionSafeArea: "safe area",
    approveTranscriptForClip: "Approve transcript",
    approveTranscriptForClipDirty: "Save transcript edits",
    chooseClipEndCue: "Choose end cue",
    clipRangeLimit: "Range invalid"
  };
  return Object.entries(variables).reduce(
    (value, [name, replacement]) =>
      value.replace(`%{${name}}`, String(replacement)),
    values[key] || key
  );
}

function findNode(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

class FakeDocument {
  createElement(tagName) {
    return new FakeNode(tagName, this);
  }
}

class FakeNode {
  constructor(tagName, ownerDocument = new FakeDocument()) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.attributes = new Map();
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}
