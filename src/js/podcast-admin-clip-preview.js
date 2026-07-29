import {
  clipCueSummary
} from "./podcast-admin-transcript-review.js";

const ASPECT_RATIOS = new Set(["9:16", "1:1", "16:9"]);
const WAVEFORM_BAR_COUNT = 18;

export function renderClipRecipePreview({
  target,
  aspectRatio,
  selection,
  transcript,
  transcriptDirty,
  startCue,
  text,
  formatTimestamp,
  formatDuration
}) {
  const render = (values = {}) => renderClipLayoutPreview({
    target,
    aspectRatio,
    text,
    formatTimestamp,
    formatDuration,
    ...values
  });
  const transcriptApproved = transcript
    && transcript.status === "approved"
    && Number(transcript.approvedRevision) === Number(transcript.revision)
    && !transcriptDirty;
  if (!transcriptApproved) {
    render({
      message: text(transcriptDirty
        ? "approveTranscriptForClipDirty"
        : "approveTranscriptForClip")
    });
    return;
  }
  if (!selection) {
    render({ message: text("chooseClipEndCue") });
    return;
  }
  if (selection.durationMs < 1_000 || selection.durationMs > 180_000) {
    render({ message: text("clipRangeLimit") });
    return;
  }
  const speaker = startCue?.speakerConfirmed && startCue.speakerLabel
    ? `${startCue.speakerLabel}: `
    : "";
  render({
    selection,
    caption: `${speaker}${clipCueSummary(startCue?.textMarkdown)}`.trim()
  });
}

export function renderClipLayoutPreview({
  target,
  aspectRatio,
  selection,
  caption,
  message = "",
  text,
  formatTimestamp,
  formatDuration
}) {
  if (
    !target?.ownerDocument
    || typeof text !== "function"
    || typeof formatTimestamp !== "function"
    || typeof formatDuration !== "function"
  ) {
    throw new TypeError("Clip layout preview controls are required");
  }
  target.replaceChildren();
  target.textContent = "";
  if (message) {
    target.dataset.state = "unavailable";
    target.removeAttribute?.("data-aspect-ratio");
    target.textContent = message;
    return;
  }
  if (
    !selection
    || !Number.isSafeInteger(selection.startsAtMs)
    || !Number.isSafeInteger(selection.endsAtMs)
    || !Number.isSafeInteger(selection.durationMs)
  ) {
    throw new TypeError("Clip layout preview selection is invalid");
  }

  const document = target.ownerDocument;
  const normalizedAspect = ASPECT_RATIOS.has(aspectRatio)
    ? aspectRatio
    : "9:16";
  const layout = document.createElement("div");
  const frame = document.createElement("figure");
  const stage = document.createElement("div");
  const safeArea = document.createElement("div");
  const safeAreaLabel = document.createElement("span");
  const waveform = document.createElement("div");
  const captionPreview = document.createElement("p");
  const details = document.createElement("div");
  const heading = document.createElement("strong");
  const summary = document.createElement("p");
  const notice = document.createElement("p");

  layout.className = "podcast-admin__clip-preview-layout";
  frame.className = "podcast-admin__clip-preview-figure";
  stage.className = "podcast-admin__clip-preview-stage";
  stage.dataset.aspectRatio = normalizedAspect;
  safeArea.className = "podcast-admin__clip-safe-area";
  safeArea.setAttribute("aria-hidden", "true");
  safeAreaLabel.textContent = text("clipSafeAreaLabel");
  waveform.className = "podcast-admin__clip-preview-waveform";
  waveform.setAttribute("aria-hidden", "true");
  captionPreview.className = "podcast-admin__clip-preview-caption";
  captionPreview.textContent = String(caption || "").trim()
    || text("clipCaptionPreviewPlaceholder");
  details.className = "podcast-admin__clip-preview-details";
  heading.textContent = text("clipLayoutPreview");
  summary.textContent = text("clipLayoutPreviewEvidence", {
    start: formatTimestamp(selection.startsAtMs),
    end: formatTimestamp(selection.endsAtMs),
    duration: formatDuration(selection.durationMs),
    dimensions: dimensionsFor(normalizedAspect)
  });
  notice.textContent = [
    text("highContrastCaptions"),
    text("captionSafeArea"),
    text("clipLayoutPreviewNotice")
  ].join(" · ");

  const bars = Array.from(
    { length: WAVEFORM_BAR_COUNT },
    (_, index) => {
      const bar = document.createElement("span");
      bar.className = [
        "podcast-admin__clip-preview-waveform-bar",
        `podcast-admin__clip-preview-waveform-bar--${index % 6}`
      ].join(" ");
      return bar;
    }
  );
  waveform.append(...bars);
  safeArea.append(safeAreaLabel);
  stage.append(waveform, safeArea, captionPreview);
  frame.append(stage);
  details.append(heading, summary, notice);
  layout.append(frame, details);
  target.append(layout);
  target.dataset.state = "ready";
  target.dataset.aspectRatio = normalizedAspect;
}

function dimensionsFor(aspectRatio) {
  if (aspectRatio === "1:1") return "1080×1080";
  if (aspectRatio === "16:9") return "1920×1080";
  return "1080×1920";
}
