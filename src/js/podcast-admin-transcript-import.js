const MAXIMUM_FILE_BYTES = 1_000_000;
const MAXIMUM_REVIEW_BYTES = 1_000_000;
const MAXIMUM_CUES = 10_000;
const MAXIMUM_CUE_DURATION_MS = 120_000;
const MAXIMUM_CAPTION_LENGTH = 2_000;
const MAXIMUM_SPEAKER_LENGTH = 80;
const MAXIMUM_TIMESTAMP_MS = 86_400_000;

export class TranscriptCaptionImportError extends Error {
  constructor(code) {
    super(code);
    this.name = "TranscriptCaptionImportError";
    this.code = code;
  }
}

export function parseTranscriptCaptionFile(value, {
  filename = "",
  type = "",
  language = "en",
  maximumEndMs = null,
  createCueId = defaultCueId
} = {}) {
  const source = String(value ?? "");
  const fileBytes = new TextEncoder().encode(source).byteLength;
  if (fileBytes < 1) throw importError("transcript_import_empty");
  if (fileBytes > MAXIMUM_FILE_BYTES) {
    throw importError("transcript_import_too_large");
  }
  const text = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  const format = captionFormat(filename, type, text);
  const blocks = text
    .trim()
    .split(/\n[ \t]*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (format === "vtt") validateWebVttHeader(blocks.shift());
  const parsed = blocks
    .filter((block) => format !== "vtt" || !isWebVttMetadata(block))
    .map((block, index) => parseCaptionBlock(block, format, index));
  if (parsed.length < 1) throw importError("transcript_import_empty");
  if (parsed.length > MAXIMUM_CUES) {
    throw importError("transcript_import_too_many_cues");
  }
  const durationLimit = optionalMaximumEnd(maximumEndMs);
  let previousEndMs = 0;
  const cues = parsed.map((cue, index) => {
    if (
      cue.endsAtMs <= cue.startsAtMs
      || cue.endsAtMs - cue.startsAtMs > MAXIMUM_CUE_DURATION_MS
      || cue.startsAtMs < previousEndMs
      || (durationLimit !== null && cue.endsAtMs > durationLimit)
    ) {
      throw importError("transcript_import_timing_invalid");
    }
    previousEndMs = cue.endsAtMs;
    return {
      id: String(createCueId(index)),
      startsAtMs: cue.startsAtMs,
      endsAtMs: cue.endsAtMs,
      speakerLabel: cue.speakerLabel,
      speakerConfirmed: false,
      textMarkdown: cue.textMarkdown
    };
  });
  const normalizedLanguage = ["en", "es"].includes(language) ? language : "en";
  const reviewBytes = new TextEncoder().encode(JSON.stringify({
    schemaVersion: 1,
    language: normalizedLanguage,
    cues
  })).byteLength;
  if (reviewBytes > MAXIMUM_REVIEW_BYTES) {
    throw importError("transcript_import_too_large");
  }
  return { format, cues, fileBytes, reviewBytes };
}

export function mountTranscriptCaptionImport({
  root,
  text,
  applyImport,
  canEdit,
  hasExistingContent,
  getLanguage,
  getMaximumEndMs,
  getContextKey,
  confirmReplace = (message) => globalThis.confirm?.(message) === true
}) {
  const section = root.querySelector("[data-podcast-transcript-import]");
  const form = root.querySelector("[data-podcast-transcript-import-form]");
  const fileInput = root.querySelector("[data-podcast-transcript-import-file]");
  const submit = root.querySelector("[data-podcast-transcript-import-submit]");
  const status = root.querySelector("[data-podcast-transcript-import-status]");
  if (!section || !form || !fileInput || !submit || !status) {
    return { reset() {}, setState() {} };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (canEdit() !== true) return;
    const file = fileInput.files?.[0];
    if (!file) {
      setImportStatus(status, text("transcriptImportChooseFile"), true);
      return;
    }
    const contextKey = String(getContextKey() || "");
    if (!contextKey) return;
    if (file.size < 1 || file.size > MAXIMUM_FILE_BYTES) {
      setImportStatus(status, text(
        file.size < 1
          ? "transcriptImportEmpty"
          : "transcriptImportTooLarge"
      ), true);
      return;
    }
    submit.disabled = true;
    setImportStatus(status, text("transcriptImportReading"));
    try {
      const parsed = parseTranscriptCaptionFile(await file.text(), {
        filename: file.name,
        type: file.type,
        language: getLanguage(),
        maximumEndMs: getMaximumEndMs()
      });
      if (
        canEdit() !== true
        || String(getContextKey() || "") !== contextKey
      ) {
        throw importError("transcript_import_context_changed");
      }
      if (
        hasExistingContent() === true
        && !confirmReplace(text("transcriptImportReplaceConfirmation"))
      ) {
        setImportStatus(status, text("transcriptImportCanceled"));
        return;
      }
      applyImport(parsed);
      fileInput.value = "";
      setImportStatus(status, text("transcriptImportApplied", {
        count: new Intl.NumberFormat(
          globalThis.document?.documentElement?.lang || "en"
        ).format(parsed.cues.length),
        format: parsed.format.toUpperCase()
      }));
    } catch (error) {
      setImportStatus(status, text(importErrorTextKey(error)), true);
    } finally {
      submit.disabled = canEdit() !== true;
    }
  });

  return {
    reset() {
      fileInput.value = "";
      setImportStatus(status, "");
    },
    setState({ available, editable }) {
      section.hidden = available !== true;
      fileInput.disabled = editable !== true;
      submit.disabled = editable !== true;
    }
  };
}

function captionFormat(filename, type, text) {
  const extension = String(filename).toLowerCase().match(/\.(vtt|srt)$/)?.[1];
  const mime = String(type).toLowerCase().split(";", 1)[0].trim();
  const mimeFormat = mime === "text/vtt"
    ? "vtt"
    : [
        "application/x-subrip",
        "application/srt",
        "text/srt"
      ].includes(mime)
      ? "srt"
      : "";
  if (extension && mimeFormat && extension !== mimeFormat) {
    throw importError("transcript_import_unsupported");
  }
  const format = extension
    || mimeFormat
    || (/^\uFEFF?WEBVTT(?:[ \t]|$)/.test(text) ? "vtt" : "");
  if (!format) throw importError("transcript_import_unsupported");
  return format;
}

function validateWebVttHeader(block) {
  const firstLine = String(block || "").split("\n", 1)[0];
  if (!/^WEBVTT(?:[ \t].*)?$/.test(firstLine)) {
    throw importError("transcript_import_invalid");
  }
}

function isWebVttMetadata(block) {
  return /^(?:NOTE(?:[ \t]|$)|STYLE$|REGION$)/.test(block);
}

function parseCaptionBlock(block, format, index) {
  const lines = block.split("\n").map((line) => line.trimEnd());
  const timingIndex = timingLine(lines[0], format)
    ? 0
    : timingLine(lines[1], format)
      ? 1
      : -1;
  if (
    timingIndex < 0
    || (format === "srt" && timingIndex === 1 && !/^\d+$/.test(lines[0].trim()))
  ) {
    throw importError("transcript_import_invalid");
  }
  const timing = timingLine(lines[timingIndex], format);
  const payload = lines.slice(timingIndex + 1).join(" ").trim();
  if (!timing || !payload) throw importError("transcript_import_invalid");
  const parsedText = captionPayload(payload, format);
  return {
    ...timing,
    ...parsedText,
    index
  };
}

function timingLine(value, format) {
  const separator = format === "vtt" ? "\\." : ",";
  const timestamp = format === "vtt"
    ? `(?:\\d{2,}:)?\\d{2}:\\d{2}${separator}\\d{3}`
    : `\\d+:\\d{2}:\\d{2}${separator}\\d{3}`;
  const match = String(value || "").match(
    new RegExp(`^(${timestamp})[ \\t]+-->[ \\t]+(${timestamp})(?:[ \\t]+.*)?$`)
  );
  if (!match) return null;
  return {
    startsAtMs: parseTimestamp(match[1], format),
    endsAtMs: parseTimestamp(match[2], format)
  };
}

function parseTimestamp(value, format) {
  const normalized = format === "srt" ? value.replace(",", ".") : value;
  const fields = normalized.split(":");
  const secondsField = fields.pop();
  const minutes = Number(fields.pop());
  const hours = Number(fields.pop() || 0);
  const [secondsText, millisecondsText] = secondsField.split(".");
  const seconds = Number(secondsText);
  const milliseconds = Number(millisecondsText);
  if (
    !Number.isSafeInteger(hours)
    || !Number.isSafeInteger(minutes)
    || !Number.isSafeInteger(seconds)
    || !Number.isSafeInteger(milliseconds)
    || hours < 0
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
    || milliseconds < 0
    || milliseconds > 999
  ) {
    throw importError("transcript_import_timing_invalid");
  }
  const total = hours * 3_600_000
    + minutes * 60_000
    + seconds * 1_000
    + milliseconds;
  if (total > MAXIMUM_TIMESTAMP_MS) {
    throw importError("transcript_import_timing_invalid");
  }
  return total;
}

function captionPayload(value, format) {
  let payload = value;
  let speakerLabel = "";
  if (format === "vtt" && /^<v[ \t]/i.test(payload)) {
    const voice = payload.match(/^<v[ \t]+([^>]+)>([\s\S]*)<\/v>$/i);
    if (!voice) throw importError("transcript_import_invalid");
    speakerLabel = normalizedSpeaker(decodeEntities(voice[1]));
    payload = voice[2];
  }
  const tags = payload.match(/<[^>]*>/g) || [];
  if (tags.some((tag) => !/^<\/?(?:b|i|u)>$/i.test(tag))) {
    throw importError("transcript_import_invalid");
  }
  const textMarkdown = normalizedCaption(
    decodeEntities(payload.replace(/<\/?(?:b|i|u)>/gi, " "))
  );
  return { speakerLabel, textMarkdown };
}

function normalizedCaption(value) {
  const text = String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !text
    || text.length > MAXIMUM_CAPTION_LENGTH
    || /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069<>]/.test(text)
  ) {
    throw importError("transcript_import_invalid");
  }
  return text;
}

function normalizedSpeaker(value) {
  const label = String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  if (
    !label
    || label.length > MAXIMUM_SPEAKER_LENGTH
    || /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069<>]/.test(label)
  ) {
    throw importError("transcript_import_invalid");
  }
  return label;
}

function decodeEntities(value) {
  return String(value).replace(
    /&(amp|lt|gt|quot|apos);|&#(x[0-9a-f]+|\d+);/gi,
    (match, named, numeric) => {
      if (named) {
        return {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: "\"",
          apos: "'"
        }[named.toLowerCase()];
      }
      const codePoint = Number.parseInt(
        numeric.replace(/^x/i, ""),
        /^x/i.test(numeric) ? 16 : 10
      );
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        throw importError("transcript_import_invalid");
      }
    }
  );
}

function optionalMaximumEnd(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1
    ? Math.min(number, MAXIMUM_TIMESTAMP_MS)
    : null;
}

function defaultCueId() {
  return `cue_${crypto.randomUUID().replace(/-/g, "")}`;
}

function importError(code) {
  return new TranscriptCaptionImportError(code);
}

function importErrorTextKey(error) {
  const code = error instanceof TranscriptCaptionImportError
    ? error.code
    : "transcript_import_invalid";
  return {
    transcript_import_empty: "transcriptImportEmpty",
    transcript_import_too_large: "transcriptImportTooLarge",
    transcript_import_too_many_cues: "transcriptImportTooManyCues",
    transcript_import_timing_invalid: "transcriptImportTimingInvalid",
    transcript_import_context_changed: "transcriptImportContextChanged",
    transcript_import_unsupported: "transcriptImportUnsupported"
  }[code] || "transcriptImportInvalid";
}

function setImportStatus(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("is-error", error);
}
