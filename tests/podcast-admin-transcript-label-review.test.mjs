import assert from "node:assert/strict";
import test from "node:test";

import {
  mountTranscriptLabelReview
} from "../src/js/podcast-admin-transcript-label-review.js";

test("marks an intentionally unlabeled transcript dirty without saving it", () => {
  const input = control();
  const transcript = {
    status: "needs_review",
    speakerLabelsConfirmed: false,
    cues: [{ speakerLabel: "", speakerConfirmed: false }]
  };
  let dirty = false;
  let status;
  const review = mountTranscriptLabelReview({
    root: { querySelector: () => input },
    text: (key) => key,
    canEdit: () => true,
    getTranscript: () => transcript,
    syncCues: () => transcript.cues,
    markDirty() { dirty = true; },
    setStatus(message, error) { status = { message, error }; },
    formatError: (error) => error.message
  });
  review.render(transcript, transcript.cues);
  assert.equal(input.disabled, false);
  input.checked = true;
  input.dispatchEvent(new Event("change"));
  assert.equal(input.disabled, true);
  assert.equal(dirty, true);
  assert.deepEqual(status, {
    message: "speakerLabelsReviewedLocally",
    error: undefined
  });
});

test("rejects an unconfirmed named speaker and locks persisted review", () => {
  const input = control();
  const transcript = {
    status: "needs_review",
    speakerLabelsConfirmed: false,
    cues: [{ speakerLabel: "Guest", speakerConfirmed: false }]
  };
  let status;
  const review = mountTranscriptLabelReview({
    root: { querySelector: () => input },
    text: (key) => key,
    canEdit: () => true,
    getTranscript: () => transcript,
    syncCues: () => transcript.cues,
    markDirty() { throw new Error("must not become dirty"); },
    setStatus(message, error) { status = { message, error }; },
    formatError: (error) => error.message
  });
  review.render(transcript, transcript.cues);
  assert.equal(input.disabled, true);
  input.disabled = false;
  input.checked = true;
  input.dispatchEvent(new Event("change"));
  assert.equal(input.checked, false);
  assert.deepEqual(status, {
    message: "confirmNamedSpeakersFirst",
    error: true
  });

  transcript.speakerLabelsConfirmed = true;
  review.render(transcript, transcript.cues);
  assert.equal(input.checked, true);
  assert.equal(input.disabled, true);
});

function control() {
  const input = new EventTarget();
  input.checked = false;
  input.disabled = false;
  return input;
}
