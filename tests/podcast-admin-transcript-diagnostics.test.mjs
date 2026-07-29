import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
const source = await readFile(
  path.resolve(
    import.meta.dirname,
    "../src/js/podcast-admin-transcript-review.js"
  ),
  "utf8"
);
const {
  applyTranscriptSpeakerRange,
  clipCueSummary,
  millisecondsToTimestamp,
  navigateToTranscriptReviewCue,
  summarizeTranscriptReview,
  transcriptCuePlainText,
  TRANSCRIPT_REVIEW_THRESHOLDS
} = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("applies one reviewed speaker label without changing cue content", () => {
  const cues = [
    cue({
      id: "cue_1",
      startsAtMs: 100,
      endsAtMs: 900,
      textMarkdown: "First caption."
    }),
    cue({
      id: "cue_2",
      startsAtMs: 1_000,
      endsAtMs: 2_000,
      textMarkdown: "Second caption."
    }),
    cue({
      id: "cue_3",
      startsAtMs: 2_100,
      endsAtMs: 3_000,
      textMarkdown: "Third caption."
    })
  ];
  const result = applyTranscriptSpeakerRange(cues, {
    startCue: "1",
    endCue: "2",
    speakerLabel: "  Jay   Renteria  ",
    speakerConfirmed: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.affectedCueCount, 2);
  assert.equal(result.changedCueCount, 2);
  assert.equal(result.speakerLabel, "Jay Renteria");
  assert.deepEqual(
    result.cues.map(({ speakerLabel, speakerConfirmed }) => ({
      speakerLabel,
      speakerConfirmed
    })),
    [
      { speakerLabel: "Jay Renteria", speakerConfirmed: true },
      { speakerLabel: "Jay Renteria", speakerConfirmed: true },
      { speakerLabel: "", speakerConfirmed: false }
    ]
  );
  assert.deepEqual(
    result.cues.map(({ id, startsAtMs, endsAtMs, textMarkdown }) => ({
      id,
      startsAtMs,
      endsAtMs,
      textMarkdown
    })),
    cues.map(({ id, startsAtMs, endsAtMs, textMarkdown }) => ({
      id,
      startsAtMs,
      endsAtMs,
      textMarkdown
    }))
  );
  assert.equal(cues[0].speakerLabel, "");
  assert.equal(cues[0].speakerConfirmed, false);
});

test("keeps speaker-range edits bounded, explicit, and replay-safe", () => {
  const cues = [
    cue({ speakerLabel: "Jay Renteria", speakerConfirmed: true }),
    cue()
  ];
  const replay = applyTranscriptSpeakerRange(cues, {
    startCue: 1,
    endCue: 1,
    speakerLabel: "Jay Renteria",
    speakerConfirmed: true
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.changedCueCount, 0);
  assert.equal(replay.cues[0], cues[0]);

  for (const input of [
    { startCue: 0, endCue: 1, speakerLabel: "Jay" },
    { startCue: 2, endCue: 1, speakerLabel: "Jay" },
    { startCue: 1, endCue: 3, speakerLabel: "Jay" },
    { startCue: 1.5, endCue: 2, speakerLabel: "Jay" }
  ]) {
    assert.deepEqual(
      applyTranscriptSpeakerRange(cues, input),
      { ok: false, error: "speaker_range_invalid" }
    );
  }
  assert.deepEqual(
    applyTranscriptSpeakerRange(cues, {
      startCue: 1,
      endCue: 2,
      speakerLabel: " "
    }),
    { ok: false, error: "speaker_range_label_required" }
  );
  assert.deepEqual(
    applyTranscriptSpeakerRange(cues, {
      startCue: 1,
      endCue: 2,
      speakerLabel: `Jay${String.fromCharCode(10)}Renteria`
    }),
    { ok: false, error: "speaker_range_label_invalid" }
  );
  assert.deepEqual(
    applyTranscriptSpeakerRange(cues, {
      startCue: 1,
      endCue: 2,
      speakerLabel: "x".repeat(81)
    }),
    { ok: false, error: "speaker_range_label_invalid" }
  );
});

test("summarizes bounded transcript review signals without retaining text", () => {
  const summary = summarizeTranscriptReview([
    cue({
      startsAtMs: 0,
      endsAtMs: 400,
      textMarkdown: "Short.",
      speakerLabel: "Jay"
    }),
    cue({
      startsAtMs: 500,
      endsAtMs: 11_501,
      textMarkdown: "A deliberately long cue.",
      speakerLabel: "Jay",
      speakerConfirmed: true
    }),
    cue({
      startsAtMs: 12_000,
      endsAtMs: 13_000,
      textMarkdown: "12345678901234567890123456"
    }),
    cue({
      startsAtMs: 15_000,
      endsAtMs: 15_000,
      textMarkdown: "Invalid timing."
    })
  ]);

  assert.deepEqual(summary, {
    cueCount: 4,
    unlabeledCueCount: 2,
    firstUnlabeledCueIndex: 2,
    unconfirmedSpeakerCueCount: 1,
    firstUnconfirmedSpeakerCueIndex: 0,
    distinctSpeakerCount: 1,
    reviewCueCount: 4,
    signals: {
      invalidTiming: { count: 1, firstCueIndex: 3 },
      shortDuration: { count: 1, firstCueIndex: 0 },
      longDuration: { count: 1, firstCueIndex: 1 },
      fastReading: { count: 1, firstCueIndex: 2 }
    }
  });
  assert.equal(JSON.stringify(summary).includes("Short"), false);
});

test("uses strict signal boundaries and visible Markdown characters", () => {
  const summary = summarizeTranscriptReview([
    cue({
      startsAtMs: 0,
      endsAtMs: TRANSCRIPT_REVIEW_THRESHOLDS.minimumCueDurationMs,
      textMarkdown: "[Hola](https://dustwave.xyz) **mundo**",
      speakerLabel: "Jay",
      speakerConfirmed: true
    }),
    cue({
      startsAtMs: 1_000,
      endsAtMs: 1_000
        + TRANSCRIPT_REVIEW_THRESHOLDS.maximumCueDurationMs,
      textMarkdown: "Boundary."
    })
  ]);

  assert.equal(summary.reviewCueCount, 0);
  assert.deepEqual(summary.signals.shortDuration, {
    count: 0,
    firstCueIndex: null
  });
  assert.deepEqual(summary.signals.longDuration, {
    count: 0,
    firstCueIndex: null
  });
  assert.deepEqual(summary.signals.fastReading, {
    count: 0,
    firstCueIndex: null
  });
});

test("returns an empty, stable contract for missing cues", () => {
  assert.deepEqual(summarizeTranscriptReview(null), {
    cueCount: 0,
    unlabeledCueCount: 0,
    firstUnlabeledCueIndex: null,
    unconfirmedSpeakerCueCount: 0,
    firstUnconfirmedSpeakerCueIndex: null,
    distinctSpeakerCount: 0,
    reviewCueCount: 0,
    signals: {
      invalidTiming: { count: 0, firstCueIndex: null },
      shortDuration: { count: 0, firstCueIndex: null },
      longDuration: { count: 0, firstCueIndex: null },
      fastReading: { count: 0, firstCueIndex: null }
    }
  });
});

test("shares stable transcript display helpers with the workbench", () => {
  assert.equal(
    transcriptCuePlainText(
      "[Visible words](https://dustwave.xyz/private) with **emphasis**"
    ),
    "Visible words with emphasis"
  );
  assert.equal(
    clipCueSummary(
      "[A very long caption](https://dustwave.xyz) with **visible words** "
        + "that must be shortened before it is displayed in a cue selector."
    ),
    "A very long caption with visible words that must be shortened before…"
  );
  assert.equal(millisecondsToTimestamp(3_716_060), "61:56.060");
  assert.equal(millisecondsToTimestamp(-1), "0:00.000");
});

test("opens a flagged cue on its paginated editor page", () => {
  let synchronized = 0;
  let openedPage = null;
  let scrolled = 0;
  let focused = 0;
  const row = {
    dataset: { transcriptCueId: "cue_102" },
    scrollIntoView() {
      scrolled += 1;
    },
    querySelector(selector) {
      assert.equal(selector, "[data-transcript-start]");
      return {
        focus() {
          focused += 1;
        }
      };
    }
  };
  const cues = Array.from({ length: 130 }, (_, index) => ({
    id: `cue_${index + 1}`
  }));

  assert.equal(navigateToTranscriptReviewCue({
    cueIndex: 101,
    cues,
    cuesPerPage: 100,
    syncVisibleCues() {
      synchronized += 1;
    },
    showPage(page) {
      openedPage = page;
    },
    cuesRoot: {
      querySelectorAll(selector) {
        assert.equal(selector, "[data-transcript-cue-id]");
        return [row];
      }
    }
  }), true);
  assert.equal(synchronized, 1);
  assert.equal(openedPage, 1);
  assert.equal(scrolled, 1);
  assert.equal(focused, 1);
  assert.equal(navigateToTranscriptReviewCue({
    cueIndex: 130,
    cues,
    cuesPerPage: 100,
    syncVisibleCues() {},
    showPage() {},
    cuesRoot: null
  }), false);
});

function cue(overrides = {}) {
  return {
    startsAtMs: 0,
    endsAtMs: 1_000,
    speakerLabel: "",
    speakerConfirmed: false,
    textMarkdown: "",
    ...overrides
  };
}
