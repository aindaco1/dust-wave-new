import assert from "node:assert/strict";
import test from "node:test";

import {
  mountPodcastReviewDraftGuard
} from "../src/js/podcast-admin-unsaved-changes-core.js";
import {
  mountUnsavedChangesGuard
} from "../shared/dust-wave-platform/packages/admin-shell/src/unsaved-changes.js";

function eventTarget(value = "") {
  const listeners = new Map();
  return {
    value,
    addEventListener(name, listener) {
      const entries = listeners.get(name) || [];
      entries.push(listener);
      listeners.set(name, entries);
    },
    emit(name, event = {}) {
      for (const listener of listeners.get(name) || []) listener(event);
    },
    removeEventListener(name, listener) {
      listeners.set(
        name,
        (listeners.get(name) || []).filter((entry) => entry !== listener)
      );
    }
  };
}

function fixture(confirmDiscard = () => true) {
  const lifecycleTarget = eventTarget();
  const showSelect = eventTarget("show-one");
  const transcriptEpisodeSelect = eventTarget("episode-one");
  const transcriptLanguageSelect = eventTarget("es");
  const chapterEpisodeSelect = eventTarget("episode-one");
  const logoutButton = eventTarget();
  let transcriptDirty = false;
  let chapterDirty = false;
  let transcriptLoads = 0;
  let chapterLoads = 0;
  const guard = mountPodcastReviewDraftGuard({
    mountUnsavedChangesGuard,
    eventTarget: lifecycleTarget,
    confirmDiscard,
    showSelects: [showSelect],
    transcriptEpisodeSelect,
    transcriptLanguageSelect,
    chapterEpisodeSelect,
    logoutButton,
    hasTranscriptChanges: () => transcriptDirty,
    hasChapterChanges: () => chapterDirty,
    discardTranscriptChanges: () => {
      transcriptDirty = false;
    },
    discardChapterChanges: () => {
      chapterDirty = false;
    },
    loadTranscript: () => {
      transcriptLoads += 1;
    },
    loadChapters: () => {
      chapterLoads += 1;
    },
    message: () => "Discard unsaved review changes?"
  });
  return {
    chapterEpisodeSelect,
    guard,
    lifecycleTarget,
    logoutButton,
    setChapterDirty(value) {
      chapterDirty = value;
    },
    setTranscriptDirty(value) {
      transcriptDirty = value;
    },
    showSelect,
    transcriptEpisodeSelect,
    transcriptLanguageSelect,
    counts: () => ({ chapterLoads, transcriptLoads })
  };
}

test("restores the accepted transcript context when discard is declined", () => {
  const messages = [];
  const state = fixture((message) => {
    messages.push(message);
    return false;
  });
  state.setTranscriptDirty(true);
  state.transcriptEpisodeSelect.emit("focus");
  state.transcriptEpisodeSelect.value = "episode-two";
  let stopped = false;
  state.transcriptEpisodeSelect.emit("change", {
    preventDefault() {},
    stopImmediatePropagation() {
      stopped = true;
    }
  });

  assert.equal(state.transcriptEpisodeSelect.value, "episode-one");
  assert.equal(stopped, true);
  assert.deepEqual(state.counts(), { chapterLoads: 0, transcriptLoads: 0 });
  assert.deepEqual(messages, ["Discard unsaved review changes?"]);
  assert.equal(state.guard.hasUnsavedChanges(), true);
});

test("discards only the affected draft and loads the accepted context", () => {
  const state = fixture();
  state.setTranscriptDirty(true);
  state.setChapterDirty(true);
  state.transcriptLanguageSelect.emit("focus");
  state.transcriptLanguageSelect.value = "en";
  state.transcriptLanguageSelect.emit("change");

  assert.equal(state.transcriptLanguageSelect.value, "en");
  assert.deepEqual(state.counts(), { chapterLoads: 0, transcriptLoads: 1 });
  assert.equal(
    state.guard.hasUnsavedChanges(),
    true,
    "unrelated chapter edits must remain dirty"
  );
});

test("show changes and logout protect both review draft types", () => {
  const decisions = [false, true, true];
  const state = fixture(() => decisions.shift());
  state.setTranscriptDirty(true);
  state.setChapterDirty(true);
  state.showSelect.emit("focus");
  state.showSelect.value = "show-two";
  state.showSelect.emit("change", {
    preventDefault() {},
    stopImmediatePropagation() {}
  });
  assert.equal(state.showSelect.value, "show-one");
  assert.equal(state.guard.hasUnsavedChanges(), true);

  state.showSelect.value = "show-two";
  state.showSelect.emit("change");
  assert.equal(state.guard.hasUnsavedChanges(), false);

  state.setTranscriptDirty(true);
  state.logoutButton.emit("click");
  assert.equal(state.guard.hasUnsavedChanges(), false);
});

test("beforeunload is blocked for either dirty review draft", () => {
  const state = fixture();
  state.setChapterDirty(true);
  const event = {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
  state.lifecycleTarget.emit("beforeunload", event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.returnValue, "");
});
