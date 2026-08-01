import assert from "node:assert/strict";
import test from "node:test";

import {
  canQueueCurrentOperation,
  createRetriableOperationId,
  hasActiveCurrentOperation
} from "../src/js/podcast-admin-retriable-operation.js";
import {
  mountYouTubeAudioRenditions
} from "../src/js/podcast-admin-youtube-audio-renditions.js";

test("reuses one valid operation ID until the exact request is accepted", () => {
  let sequence = 0;
  const operation = createRetriableOperationId(
    (prefix) => `${prefix}_fixture_${++sequence}`,
    "youtube_rendition"
  );

  assert.equal(
    operation.get("episode_fixture:master_fixture"),
    "youtube_rendition_fixture_1"
  );
  assert.equal(
    operation.get("episode_fixture:master_fixture"),
    "youtube_rendition_fixture_1"
  );
  assert.equal(
    operation.accept("episode_fixture:master_fixture", "wrong_id"),
    false
  );
  assert.equal(
    operation.get("episode_fixture:master_fixture"),
    "youtube_rendition_fixture_1"
  );
  assert.equal(
    operation.accept(
      "episode_fixture:master_fixture",
      "youtube_rendition_fixture_1"
    ),
    true
  );
  assert.equal(
    operation.get("episode_fixture:master_fixture"),
    "youtube_rendition_fixture_2"
  );
  operation.reset();
  assert.equal(
    operation.get("episode_fixture:master_fixture"),
    "youtube_rendition_fixture_3"
  );
});

test("fails closed on malformed operation factories and IDs", () => {
  assert.throws(
    () => createRetriableOperationId(null, "youtube_rendition"),
    TypeError
  );
  const invalid = createRetriableOperationId(
    () => "unsafe/id",
    "youtube_rendition"
  );
  assert.throws(() => invalid.get("episode:master"), TypeError);
  assert.throws(
    () => createRetriableOperationId(() => "valid_id", "unsafe/prefix"),
    TypeError
  );
});

test("detects only current operations in explicitly active states", () => {
  const active = new Set(["queued", "rendering", "ready"]);
  assert.equal(hasActiveCurrentOperation([
    { current: false, status: "ready" },
    { current: true, status: "failed" }
  ], active), false);
  assert.equal(hasActiveCurrentOperation([
    { current: true, status: "ready" }
  ], active), true);
  assert.equal(hasActiveCurrentOperation(null, active), false);
  assert.equal(canQueueCurrentOperation({
    currentId: "master_fixture",
    processorEnabled: true,
    authorized: true,
    rows: [{ current: true, status: "ready" }],
    activeStatuses: active
  }), false);
});

test("retries an ambiguous queue with one rendition ID", async () => {
  const fixture = renditionFixture({ failFirstQueue: true });
  try {
    await fixture.controller.refresh();
    assert.equal(fixture.queueButton.disabled, false);

    await fixture.queueButton.dispatch("click");
    assert.equal(fixture.queueButton.disabled, false);
    assert.deepEqual(fixture.posts.map(({ body }) => body.renditionId), [
      "youtube_rendition_fixture_1"
    ]);

    await fixture.queueButton.dispatch("click");
    assert.deepEqual(fixture.posts.map(({ body }) => body.renditionId), [
      "youtube_rendition_fixture_1",
      "youtube_rendition_fixture_1"
    ]);
    assert.equal(fixture.operationCount(), 1);
    assert.equal(fixture.queueButton.disabled, true);
    assert.equal(fixture.results.children.length, 1);
  } finally {
    fixture.restore();
  }
});

test("prevents duplicate current renders but permits recovery from failure", async () => {
  const fixture = renditionFixture({
    renditions: [{
      id: "youtube_rendition_ready",
      status: "ready",
      current: true,
      sourceBytes: 1_024,
      outputBytes: 2_048
    }]
  });
  try {
    await fixture.controller.refresh();
    assert.equal(fixture.queueButton.disabled, true);
    await fixture.queueButton.dispatch("click");
    assert.deepEqual(fixture.posts, []);

    fixture.setRenditions([{
      id: "youtube_rendition_failed",
      status: "failed",
      current: true,
      sourceBytes: 1_024,
      failureCode: "source_stale_<img src=x>"
    }]);
    await fixture.controller.refresh();
    assert.equal(fixture.queueButton.disabled, false);
    const failure = fixture.results.children[0].children.find(
      ({ className }) => className === "podcast-admin__status is-error"
    );
    assert.match(failure.textContent, /source stale <img src=x>/);
    assert.equal(fixture.createdTags.includes("img"), false);
  } finally {
    fixture.restore();
  }
});

test("keeps queue controls disabled without the required role", async () => {
  const fixture = renditionFixture({ canQueue: false });
  try {
    await fixture.controller.refresh();
    assert.equal(fixture.queueButton.disabled, true);
    await fixture.queueButton.dispatch("click");
    assert.deepEqual(fixture.posts, []);
  } finally {
    fixture.restore();
  }
});

function renditionFixture({
  failFirstQueue = false,
  renditions = [],
  canQueue = true
} = {}) {
  const originalDocument = globalThis.document;
  const originalOption = globalThis.Option;
  const select = element({ value: "episode_fixture" });
  const refreshButton = element();
  const queueButton = element({ disabled: true });
  const summary = element();
  const results = element();
  const status = element();
  const selectors = new Map([
    ["[data-podcast-youtube-audio-episode]", select],
    ["[data-podcast-youtube-audio-refresh]", refreshButton],
    ["[data-podcast-youtube-audio-queue]", queueButton],
    ["[data-podcast-youtube-audio-summary]", summary],
    ["[data-podcast-youtube-audio-results]", results],
    ["[data-podcast-youtube-audio-status]", status],
    ["#podcast-panel-production", null],
    ["#podcast-panel-episodes", null]
  ]);
  const createdTags = [];
  globalThis.document = {
    documentElement: { lang: "en" },
    createElement(tagName) {
      createdTags.push(tagName);
      return element({ tagName });
    },
    createTextNode: (textContent) => ({ textContent: String(textContent) })
  };
  globalThis.Option = class {
    constructor(text, value, _defaultSelected, selected) {
      this.text = text;
      this.value = value;
      this.selected = selected;
    }
  };
  let currentRenditions = renditions;
  let queueAttempts = 0;
  let operationSequence = 0;
  const posts = [];
  const client = {
    async request(path, options) {
      if (options?.method === "POST") {
        posts.push(options);
        queueAttempts += 1;
        if (failFirstQueue && queueAttempts === 1) {
          throw new Error("response_lost");
        }
        currentRenditions = [{
          id: options.body.renditionId,
          status: "queued",
          current: true,
          sourceBytes: 1_024
        }];
        return { rendition: { id: options.body.renditionId } };
      }
      if (path.endsWith("/audio-master")) {
        return {
          current: {
            id: "master_fixture",
            revision: 3,
            objectBytes: 1_024
          }
        };
      }
      if (path.endsWith("/youtube-audio-renditions")) {
        return {
          processorEnabled: true,
          renditions: currentRenditions
        };
      }
      throw new Error(`Unexpected request: ${path}`);
    }
  };
  const controller = mountYouTubeAudioRenditions({
    root: { querySelector: (selector) => selectors.get(selector) ?? null },
    client,
    text(key, values) {
      if (!values) return key;
      return `${key}:${JSON.stringify(values)}`;
    },
    setStatus(node, message, error = false) {
      node.textContent = message;
      node.error = error;
    },
    friendlyError: (error) => `friendly:${error.message}`,
    operationId(prefix) {
      operationSequence += 1;
      return `${prefix}_fixture_${operationSequence}`;
    },
    canQueue: () => canQueue
  });
  return {
    controller,
    createdTags,
    operationCount: () => operationSequence,
    posts,
    queueButton,
    results,
    setRenditions(value) {
      currentRenditions = value;
    },
    restore() {
      globalThis.document = originalDocument;
      globalThis.Option = originalOption;
    }
  };
}

function element(values = {}) {
  const listeners = new Map();
  return {
    tagName: "div",
    value: "",
    disabled: false,
    textContent: "",
    className: "",
    children: [],
    ...values,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type) {
      return listeners.get(type)?.({ preventDefault() {} });
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this[name] = String(value);
    }
  };
}
