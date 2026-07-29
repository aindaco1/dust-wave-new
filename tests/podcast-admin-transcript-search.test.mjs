import assert from "node:assert/strict";
import test from "node:test";

import {
  findTranscriptCueMatches,
  mountTranscriptSearch,
  TranscriptSearchError,
  TRANSCRIPT_SEARCH_LIMITS
} from "../src/js/podcast-admin-transcript-search.js";

test("finds accent-insensitive visible caption and speaker text", () => {
  const cues = [{
    speakerLabel: "Jay Rentería",
    textMarkdown: "[Ópera](https://dustwave.xyz/private) en la **selva**"
  }, {
    speakerLabel: "Invitada",
    textMarkdown: "Otro fragmento."
  }];

  assert.deepEqual(
    findTranscriptCueMatches(cues, "opera en", "es").cueIndexes,
    [0]
  );
  assert.deepEqual(
    findTranscriptCueMatches(cues, "JAY RENTERIA", "es").cueIndexes,
    [0]
  );
  assert.deepEqual(
    findTranscriptCueMatches(cues, "dustwave.xyz", "es").cueIndexes,
    []
  );
});

test("keeps transcript search inputs bounded", () => {
  assertSearchError(
    () => findTranscriptCueMatches([], " "),
    "transcript_search_query_required"
  );
  assertSearchError(
    () => findTranscriptCueMatches(
      [],
      "x".repeat(TRANSCRIPT_SEARCH_LIMITS.maximumQueryCharacters + 1)
    ),
    "transcript_search_query_too_long"
  );
  assertSearchError(
    () => findTranscriptCueMatches(
      Array.from(
        { length: TRANSCRIPT_SEARCH_LIMITS.maximumCues + 1 },
        () => ({ textMarkdown: "fixture" })
      ),
      "fixture"
    ),
    "transcript_search_too_many_cues"
  );
});

test("navigates ordered matches and resets on draft context changes", () => {
  const section = { hidden: true };
  const form = eventTarget();
  const input = {
    ...eventTarget(),
    disabled: true,
    value: ""
  };
  const previous = {
    ...eventTarget(),
    disabled: true
  };
  const next = {
    ...eventTarget(),
    disabled: true
  };
  const status = {
    textContent: "",
    classList: {
      toggle(_name, value) {
        status.error = value;
      }
    }
  };
  const elements = new Map([
    ["[data-podcast-transcript-search]", section],
    ["[data-podcast-transcript-search-form]", form],
    ["[data-podcast-transcript-search-input]", input],
    ["[data-podcast-transcript-search-previous]", previous],
    ["[data-podcast-transcript-search-next]", next],
    ["[data-podcast-transcript-search-status]", status]
  ]);
  const opened = [];
  const search = mountTranscriptSearch({
    root: { querySelector: (selector) => elements.get(selector) },
    text: (key, values = {}) =>
      `${key}:${values.current || ""}:${values.total || ""}:${values.cue || ""}`,
    getCues: () => [
      { textMarkdown: "Selva uno." },
      { textMarkdown: "Intermedio." },
      { speakerLabel: "Selva", textMarkdown: "Tercero." }
    ],
    getLanguage: () => "es",
    onOpenCue: (cueIndex) => opened.push(cueIndex)
  });

  search.setState({
    available: true,
    contextKey: "episode_fixture:es:1"
  });
  assert.equal(section.hidden, false);
  assert.equal(input.disabled, false);
  input.value = "selva";
  form.emit("submit", { preventDefault() {} });
  assert.deepEqual(opened, [0]);
  assert.equal(status.textContent, "transcriptSearchResult:1:2:1");
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, false);

  next.emit("click");
  assert.deepEqual(opened, [0, 2]);
  assert.equal(status.textContent, "transcriptSearchResult:2:2:3");
  assert.equal(previous.disabled, false);
  assert.equal(next.disabled, true);

  previous.emit("click");
  assert.deepEqual(opened, [0, 2, 0]);
  input.emit("input");
  assert.equal(status.textContent, "");
  assert.equal(previous.disabled, true);
  assert.equal(next.disabled, true);

  input.value = "selva";
  search.setState({
    available: true,
    contextKey: "episode_other:en:2"
  });
  assert.equal(input.value, "");
  assert.equal(status.textContent, "");
});

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    emit(name, event = {}) {
      listeners.get(name)?.(event);
    }
  };
}

function assertSearchError(callback, code) {
  assert.throws(callback, (error) =>
    error instanceof TranscriptSearchError
    && error.code === code
  );
}
