import assert from "node:assert/strict";
import test from "node:test";

import {
  mountTranscriptCaptionImport,
  parseTranscriptCaptionFile,
  TranscriptCaptionImportError
} from "../src/js/podcast-admin-transcript-import.js";

test("imports bounded WebVTT into unconfirmed review cues", () => {
  const parsed = parseTranscriptCaptionFile([
    "\uFEFFWEBVTT - Dust Wave export",
    "",
    "NOTE private review metadata",
    "",
    "cue-one",
    "00:00:01.000 --> 00:00:03.000 align:start",
    "<v Jay>Hola &amp; <b>selva</b></v>",
    "",
    "2",
    "00:00:03.500 --> 00:00:05.000",
    "&quot;Seguimos&quot; aquí.",
    ""
  ].join("\n"), {
    filename: "transcript-es-revision-4.vtt",
    type: "text/vtt; charset=utf-8",
    language: "es",
    maximumEndMs: 5_000,
    createCueId: (index) => `cue_import_${index + 1}`
  });

  assert.equal(parsed.format, "vtt");
  assert.deepEqual(parsed.cues, [{
    id: "cue_import_1",
    startsAtMs: 1_000,
    endsAtMs: 3_000,
    speakerLabel: "Jay",
    speakerConfirmed: false,
    textMarkdown: "Hola & selva"
  }, {
    id: "cue_import_2",
    startsAtMs: 3_500,
    endsAtMs: 5_000,
    speakerLabel: "",
    speakerConfirmed: false,
    textMarkdown: "\"Seguimos\" aquí."
  }]);
  assert.ok(parsed.reviewBytes > parsed.fileBytes);
  assert.ok(parsed.reviewBytes < 1_000_000);
});

test("keeps ambiguous SubRip speaker prefixes in review text", () => {
  const parsed = parseTranscriptCaptionFile([
    "1",
    "00:00:00,000 --> 00:00:02,500",
    "Jay: Texto sintético",
    "de control.",
    "",
    "2",
    "00:00:03,000 --> 00:00:05,000 position:50%",
    "<i>Otra voz.</i>",
    ""
  ].join("\n"), {
    filename: "transcript-es-revision-4.srt",
    type: "application/x-subrip",
    language: "es",
    createCueId: (index) => `cue_import_${index + 1}`
  });

  assert.equal(parsed.format, "srt");
  assert.equal(parsed.cues[0].speakerLabel, "");
  assert.equal(
    parsed.cues[0].textMarkdown,
    "Jay: Texto sintético de control."
  );
  assert.equal(parsed.cues[1].textMarkdown, "Otra voz.");
});

test("fails closed on unsupported, unsafe, overlapping, and out-of-range input", () => {
  assertImportError(
    () => parseTranscriptCaptionFile("plain text", {
      filename: "transcript.txt"
    }),
    "transcript_import_unsupported"
  );
  assertImportError(
    () => parseTranscriptCaptionFile([
      "WEBVTT",
      "",
      "00:00:00.000 --> 00:00:02.000",
      "Safe",
      "",
      "00:00:01.999 --> 00:00:03.000",
      "Overlap"
    ].join("\n"), { filename: "overlap.vtt" }),
    "transcript_import_timing_invalid"
  );
  assertImportError(
    () => parseTranscriptCaptionFile([
      "WEBVTT",
      "",
      "00:00:00.000 --> 00:00:02.000",
      "&lt;script&gt;"
    ].join("\n"), { filename: "unsafe.vtt" }),
    "transcript_import_invalid"
  );
  assertImportError(
    () => parseTranscriptCaptionFile([
      "1",
      "00:00:00,000 --> 00:00:03,000",
      "Past the reviewed episode duration."
    ].join("\n"), {
      filename: "too-long.srt",
      maximumEndMs: 2_999
    }),
    "transcript_import_timing_invalid"
  );
  assertImportError(
    () => parseTranscriptCaptionFile("x".repeat(1_000_001), {
      filename: "oversized.srt"
    }),
    "transcript_import_too_large"
  );
});

test("loads a local file only after explicit replacement confirmation", async () => {
  let submitHandler;
  let applied;
  let confirmation = "";
  let contextKey = "episode_fixture:es:1";
  const section = { hidden: true };
  const form = {
    addEventListener(name, handler) {
      assert.equal(name, "submit");
      submitHandler = handler;
    }
  };
  const contents = [
    "WEBVTT",
    "",
    "00:00:00.000 --> 00:00:02.000",
    "<v Jay>Local review only.</v>"
  ].join("\n");
  const fileInput = {
    disabled: true,
    files: [{
      name: "local.vtt",
      size: contents.length,
      type: "text/vtt",
      async text() {
        return contents;
      }
    }],
    value: "local.vtt"
  };
  const submit = { disabled: true };
  const status = {
    textContent: "",
    classList: {
      toggle(_name, value) {
        status.error = value;
      }
    }
  };
  const elements = new Map([
    ["[data-podcast-transcript-import]", section],
    ["[data-podcast-transcript-import-form]", form],
    ["[data-podcast-transcript-import-file]", fileInput],
    ["[data-podcast-transcript-import-submit]", submit],
    ["[data-podcast-transcript-import-status]", status]
  ]);
  const importer = mountTranscriptCaptionImport({
    root: { querySelector: (selector) => elements.get(selector) },
    text: (key, values = {}) => `${key}:${values.count || ""}`,
    applyImport(result) {
      applied = result;
    },
    canEdit: () => true,
    hasExistingContent: () => true,
    getLanguage: () => "es",
    getMaximumEndMs: () => 5_000,
    getContextKey: () => contextKey,
    confirmReplace(message) {
      confirmation = message;
      return true;
    }
  });

  importer.setState({ available: true, editable: true });
  assert.equal(section.hidden, false);
  assert.equal(fileInput.disabled, false);
  assert.equal(submit.disabled, false);
  await submitHandler({ preventDefault() {} });

  assert.equal(confirmation, "transcriptImportReplaceConfirmation:");
  assert.equal(applied.format, "vtt");
  assert.equal(applied.cues.length, 1);
  assert.equal(applied.cues[0].speakerLabel, "Jay");
  assert.equal(applied.cues[0].speakerConfirmed, false);
  assert.equal(fileInput.value, "");
  assert.equal(status.textContent, "transcriptImportApplied:1");
  assert.equal(status.error, false);

  applied = undefined;
  fileInput.files = [{
    name: "stale.vtt",
    size: contents.length,
    type: "text/vtt",
    async text() {
      contextKey = "episode_other:es:2";
      return contents;
    }
  }];
  await submitHandler({ preventDefault() {} });
  assert.equal(applied, undefined);
  assert.equal(status.textContent, "transcriptImportContextChanged:");
  assert.equal(status.error, true);
});

function assertImportError(callback, code) {
  assert.throws(callback, (error) =>
    error instanceof TranscriptCaptionImportError
    && error.code === code
  );
}
