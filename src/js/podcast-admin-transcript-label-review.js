import {
  canAcknowledgeTranscriptSpeakerLabels
} from "./podcast-admin-transcript-review.js";

export function mountTranscriptLabelReview({
  root,
  text,
  canEdit,
  getTranscript,
  syncCues,
  markDirty,
  setStatus,
  formatError
}) {
  const input = root.querySelector("[data-podcast-transcript-label-review]");
  input?.addEventListener("change", () => {
    const transcript = getTranscript();
    if (!input.checked || !transcript || !canEdit()) return;
    try {
      transcript.cues = syncCues();
      if (!canAcknowledgeTranscriptSpeakerLabels(transcript.cues)) {
        input.checked = false;
        setStatus(text("confirmNamedSpeakersFirst"), true);
        return;
      }
      input.disabled = true;
      markDirty();
      setStatus(text("speakerLabelsReviewedLocally"));
    } catch (error) {
      input.checked = false;
      setStatus(formatError(error), true);
    }
  });
  return {
    render(transcript, cues) {
      if (!input) return;
      input.checked = transcript?.speakerLabelsConfirmed === true;
      input.disabled = !canEdit()
        || transcript?.status === "approved"
        || transcript?.speakerLabelsConfirmed === true
        || !canAcknowledgeTranscriptSpeakerLabels(cues);
    }
  };
}
