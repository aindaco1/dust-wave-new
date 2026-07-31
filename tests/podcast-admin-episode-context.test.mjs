import assert from "node:assert/strict";
import test from "node:test";
import { mountEpisodeContext } from "../src/js/podcast-admin-episode-context.js";

function selectFixture({ central = false, values = [] } = {}) {
  const listeners = new Map();
  const label = { hidden: false };
  const container = { hidden: true };
  const ownerDocument = {
    createElement() {
      return { textContent: "", value: "" };
    }
  };
  return {
    ownerDocument,
    options: values.map((value) => ({ value, textContent: value })),
    value: values[0] || "",
    addEventListener(name, listener) {
      const entries = listeners.get(name) || [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    closest(selector) {
      if (central && selector === "[data-podcast-episode-context]") {
        return container;
      }
      return selector === "label" ? label : null;
    },
    emitChange(event = {}) {
      for (const listener of listeners.get("change") || []) listener(event);
    },
    removeEventListener(name, listener) {
      listeners.set(
        name,
        (listeners.get(name) || []).filter((entry) => entry !== listener)
      );
    },
    replaceChildren(...children) {
      this.options = children;
    },
    label,
    container
  };
}

const episodes = [
  { id: "episode-one", title: "Episode one", mediaStatus: "ready" },
  { id: "episode-two", title: "Episode two", mediaStatus: "processing" }
];

test("one current episode synchronizes internal tool selectors", () => {
  const select = selectFixture({ central: true });
  const transcript = selectFixture();
  const audio = selectFixture();
  const changes = [];
  const context = mountEpisodeContext({
    select,
    controls: [transcript, audio, transcript],
    onChange: (change) => changes.push(change)
  });

  context.setEpisodes(episodes);
  assert.equal(select.container.hidden, false);
  assert.equal(transcript.label.hidden, true);
  assert.equal(audio.label.hidden, true);
  assert.deepEqual(
    transcript.options.map(({ textContent }) => textContent),
    ["Episode one — ready", "Episode two — processing"]
  );
  transcript.value = "episode-two";
  transcript.emitChange();

  assert.equal(context.currentEpisodeId(), "episode-two");
  assert.equal(select.value, "episode-two");
  assert.equal(audio.value, "episode-two");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].source, transcript);
});

test("declining a dirty transition restores the accepted episode", () => {
  const select = selectFixture({ central: true });
  const transcript = selectFixture();
  let stopped = false;
  const context = mountEpisodeContext({
    select,
    controls: [transcript],
    beforeChange: () => false
  });
  context.setEpisodes(episodes);

  transcript.value = "episode-two";
  transcript.emitChange({
    preventDefault() {},
    stopImmediatePropagation() { stopped = true; }
  });

  assert.equal(stopped, true);
  assert.equal(context.currentEpisodeId(), "episode-one");
  assert.equal(select.value, "episode-one");
  assert.equal(transcript.value, "episode-one");
});

test("programmatic selection can synchronize without duplicate notifications", () => {
  const select = selectFixture({ central: true });
  const transcript = selectFixture();
  let changes = 0;
  const context = mountEpisodeContext({
    select,
    controls: [transcript],
    onChange: () => { changes += 1; }
  });
  context.setEpisodes(episodes);

  assert.equal(
    context.selectEpisode("episode-two", { notify: false }),
    true
  );
  assert.equal(context.currentEpisodeId(), "episode-two");
  assert.equal(transcript.value, "episode-two");
  assert.equal(changes, 0);
  assert.equal(context.selectEpisode("missing"), false);
  assert.equal(context.currentEpisodeId(), "episode-two");
});
