export const TRANSCRIPT_REVIEW_THRESHOLDS = Object.freeze({
  minimumCueDurationMs: 500,
  maximumCueDurationMs: 10_000,
  maximumCharactersPerSecond: 25
});

export function emptyTranscript(language) {
  return {
    id: null,
    language,
    source: "editor",
    status: "new",
    revision: 0,
    speakerLabelsConfirmed: true,
    approvedRevision: null,
    approvedAt: null,
    cues: [newTranscriptCue()],
    alignment: {
      id: null,
      status: "not_run",
      adapter: null,
      model: null,
      completedAt: null,
      alignedWordCount: 0,
      wordControlsEnabled: false
    }
  };
}

export function newTranscriptCue(startsAtMs = 0, endsAtMs = 5_000) {
  return {
    id: `cue_${crypto.randomUUID().replace(/-/g, "")}`,
    startsAtMs,
    endsAtMs,
    speakerLabel: "",
    speakerConfirmed: false,
    textMarkdown: ""
  };
}

export function applyTranscriptSpeakerRange(cues, {
  startCue,
  endCue,
  speakerLabel,
  speakerConfirmed = false
} = {}) {
  const rows = Array.isArray(cues) ? cues : [];
  const start = Number(startCue);
  const end = Number(endCue);
  if (
    rows.length === 0
    || !Number.isSafeInteger(start)
    || !Number.isSafeInteger(end)
    || start < 1
    || end < start
    || end > rows.length
  ) {
    return { ok: false, error: "speaker_range_invalid" };
  }
  const rawLabel = String(speakerLabel || "");
  if (/[\u0000-\u001F\u007F]/.test(rawLabel)) {
    return { ok: false, error: "speaker_range_label_invalid" };
  }
  const label = rawLabel
    .replace(/\s+/g, " ")
    .trim();
  if (!label) {
    return { ok: false, error: "speaker_range_label_required" };
  }
  if (
    Array.from(label).length > 80
  ) {
    return { ok: false, error: "speaker_range_label_invalid" };
  }

  const confirmed = speakerConfirmed === true;
  let changedCueCount = 0;
  const updatedCues = rows.map((cue, index) => {
    if (index < start - 1 || index >= end) return cue;
    if (
      cue?.speakerLabel === label
      && cue?.speakerConfirmed === confirmed
    ) {
      return cue;
    }
    changedCueCount += 1;
    return {
      ...cue,
      speakerLabel: label,
      speakerConfirmed: confirmed
    };
  });
  return {
    ok: true,
    cues: updatedCues,
    startCue: start,
    endCue: end,
    affectedCueCount: end - start + 1,
    changedCueCount,
    speakerLabel: label,
    speakerConfirmed: confirmed
  };
}

export function clipCueSummary(value) {
  const summary = transcriptCuePlainText(value);
  return summary.length > 72
    ? `${summary.slice(0, 69).trimEnd()}…`
    : summary;
}

export function transcriptCuePlainText(value) {
  return String(value || "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_~`[\]()>#+=-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function millisecondsToTimestamp(value) {
  const totalMilliseconds = Math.max(0, Math.round(Number(value || 0)));
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000);
  const milliseconds = totalMilliseconds % 1_000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${
    String(milliseconds).padStart(3, "0")
  }`;
}

export function summarizeTranscriptReview(cues) {
  const rows = Array.isArray(cues) ? cues : [];
  const distinctSpeakers = new Set();
  const reviewCueIndexes = new Set();
  const summary = {
    cueCount: rows.length,
    unlabeledCueCount: 0,
    firstUnlabeledCueIndex: null,
    unlabeledCueIndexes: [],
    unconfirmedSpeakerCueCount: 0,
    firstUnconfirmedSpeakerCueIndex: null,
    unconfirmedSpeakerCueIndexes: [],
    distinctSpeakerCount: 0,
    reviewCueCount: 0,
    signals: {
      invalidTiming: emptySignal(),
      shortDuration: emptySignal(),
      longDuration: emptySignal(),
      fastReading: emptySignal()
    }
  };

  rows.forEach((cue, index) => {
    const speakerLabel = String(cue?.speakerLabel || "").trim();
    if (!speakerLabel) {
      summary.unlabeledCueCount += 1;
      summary.firstUnlabeledCueIndex ??= index;
      summary.unlabeledCueIndexes.push(index);
    } else {
      distinctSpeakers.add(speakerLabel.toLocaleLowerCase());
      if (cue?.speakerConfirmed !== true) {
        summary.unconfirmedSpeakerCueCount += 1;
        summary.firstUnconfirmedSpeakerCueIndex ??= index;
        summary.unconfirmedSpeakerCueIndexes.push(index);
        reviewCueIndexes.add(index);
      }
    }

    const startsAtMs = Number(cue?.startsAtMs);
    const endsAtMs = Number(cue?.endsAtMs);
    if (
      !Number.isFinite(startsAtMs)
      || !Number.isFinite(endsAtMs)
      || startsAtMs < 0
      || endsAtMs <= startsAtMs
    ) {
      recordSignal(summary.signals.invalidTiming, index);
      reviewCueIndexes.add(index);
      return;
    }

    const durationMs = endsAtMs - startsAtMs;
    if (durationMs < TRANSCRIPT_REVIEW_THRESHOLDS.minimumCueDurationMs) {
      recordSignal(summary.signals.shortDuration, index);
      reviewCueIndexes.add(index);
    }
    if (durationMs > TRANSCRIPT_REVIEW_THRESHOLDS.maximumCueDurationMs) {
      recordSignal(summary.signals.longDuration, index);
      reviewCueIndexes.add(index);
    }
    const characterCount = captionCharacterCount(cue?.textMarkdown);
    if (
      characterCount * 1_000 / durationMs
      > TRANSCRIPT_REVIEW_THRESHOLDS.maximumCharactersPerSecond
    ) {
      recordSignal(summary.signals.fastReading, index);
      reviewCueIndexes.add(index);
    }
  });

  summary.distinctSpeakerCount = distinctSpeakers.size;
  summary.reviewCueCount = reviewCueIndexes.size;
  return summary;
}

export function navigateToTranscriptReviewCue({
  cueIndex,
  cues,
  cuesPerPage,
  syncVisibleCues,
  showPage,
  cuesRoot
}) {
  if (
    !Array.isArray(cues)
    || !Number.isInteger(cueIndex)
    || cueIndex < 0
    || cueIndex >= cues.length
  ) return false;
  syncVisibleCues();
  const cueId = cues[cueIndex]?.id;
  showPage(Math.floor(cueIndex / cuesPerPage));
  const reveal = globalThis.requestAnimationFrame
    || ((callback) => callback());
  reveal(() => {
    const row = Array.from(
      cuesRoot?.querySelectorAll("[data-transcript-cue-id]") || []
    ).find((candidate) => candidate.dataset.transcriptCueId === cueId);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.querySelector("[data-transcript-start]")?.focus();
  });
  return true;
}

export function transcriptReviewDiagnosticItems(summary, text) {
  const items = [];
  if (
    summary.unlabeledCueCount > 0
    || summary.unconfirmedSpeakerCueCount > 0
  ) {
    const cueIndexes = [
      ...summary.unlabeledCueIndexes,
      ...summary.unconfirmedSpeakerCueIndexes
    ].sort((left, right) => left - right);
    items.push({
      key: "speakers",
      label: text("transcriptDiagnosticSpeakers", {
        speakers: localizedNumber(summary.distinctSpeakerCount),
        unlabeled: localizedNumber(summary.unlabeledCueCount),
        unconfirmed: localizedNumber(summary.unconfirmedSpeakerCueCount)
      }),
      cueIndex: cueIndexes[0],
      cueIndexes
    });
  }
  addSignal(items, "invalidTiming", summary.signals.invalidTiming, text(
    "transcriptDiagnosticInvalidTiming",
    { count: localizedNumber(summary.signals.invalidTiming.count) }
  ));
  addSignal(items, "shortDuration", summary.signals.shortDuration, text(
    "transcriptDiagnosticShort",
    {
      count: localizedNumber(summary.signals.shortDuration.count),
      seconds: localizedThreshold(
        TRANSCRIPT_REVIEW_THRESHOLDS.minimumCueDurationMs / 1_000
      )
    }
  ));
  addSignal(items, "longDuration", summary.signals.longDuration, text(
    "transcriptDiagnosticLong",
    {
      count: localizedNumber(summary.signals.longDuration.count),
      seconds: localizedThreshold(
        TRANSCRIPT_REVIEW_THRESHOLDS.maximumCueDurationMs / 1_000
      )
    }
  ));
  addSignal(items, "fastReading", summary.signals.fastReading, text(
    "transcriptDiagnosticFast",
    {
      count: localizedNumber(summary.signals.fastReading.count),
      rate: localizedNumber(
        TRANSCRIPT_REVIEW_THRESHOLDS.maximumCharactersPerSecond
      )
    }
  ));
  return items;
}

export function resolveTranscriptDiagnosticPosition(
  cueIndexes,
  selectedCueIndex
) {
  if (!Array.isArray(cueIndexes) || cueIndexes.length === 0) return -1;
  const position = cueIndexes.indexOf(selectedCueIndex);
  return position >= 0 ? position : 0;
}

export function stepTranscriptDiagnosticPosition(
  cueIndexes,
  position,
  direction
) {
  if (!Array.isArray(cueIndexes) || cueIndexes.length === 0) return -1;
  const current = Number.isInteger(position) ? position : 0;
  const step = direction === -1 ? -1 : direction === 1 ? 1 : 0;
  return Math.min(
    cueIndexes.length - 1,
    Math.max(0, current + step)
  );
}

function addSignal(items, key, signal, label) {
  if (signal.count > 0) {
    items.push({
      key,
      label,
      cueIndex: signal.firstCueIndex,
      cueIndexes: signal.cueIndexes
    });
  }
}

function localizedNumber(value) {
  return new Intl.NumberFormat(
    globalThis.document?.documentElement?.lang || "en"
  ).format(Number(value || 0));
}

function localizedThreshold(value) {
  return new Intl.NumberFormat(
    globalThis.document?.documentElement?.lang || "en",
    { maximumFractionDigits: 1 }
  ).format(Number(value || 0));
}

function emptySignal() {
  return { count: 0, firstCueIndex: null, cueIndexes: [] };
}

function recordSignal(signal, cueIndex) {
  signal.count += 1;
  signal.firstCueIndex ??= cueIndex;
  signal.cueIndexes.push(cueIndex);
}

function captionCharacterCount(value) {
  const visibleText = String(value || "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1")
    .replace(/[*_~`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(visibleText).length;
}
