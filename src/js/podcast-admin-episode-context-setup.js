import { mountEpisodeContext } from "./podcast-admin-episode-context.js";
import {
  revealEpisodePublishWorkflow
} from "./podcast-admin-publish-workflow.js";
import { mountPodcastReviewDraftGuard } from "./podcast-admin-unsaved-changes.js";

const episodeControlSelectors = [
  "[data-podcast-upload-form] [name='episodeId']",
  "[data-podcast-ad-plan-form] [name='episodeId']",
  "[data-podcast-audio-qc-episode]",
  "[data-podcast-audio-master-episode]",
  "[data-podcast-delivery-audio-episode]",
  "[data-podcast-youtube-audio-episode]",
  "[data-podcast-transcript-episode]",
  "[data-podcast-chapter-episode]",
  "[data-podcast-review-episode]"
];

export function mountPodcastEpisodeContext({
  root,
  text,
  hasTranscriptChanges,
  hasChapterChanges,
  discardTranscriptChanges,
  discardChapterChanges,
  loadTranscript,
  loadChapters,
  onChange
}) {
  const select = root.querySelector("[data-podcast-current-episode]");
  const query = (selector) => root.querySelector(selector);
  const controls = episodeControlSelectors.map(query).filter(Boolean);
  let reviewDraftGuard;
  const context = mountEpisodeContext({
    select,
    controls,
    beforeChange() {
      if (!reviewDraftGuard?.confirmTransition(
        text("discardUnsavedReviewChanges")
      )) return false;
      discardTranscriptChanges();
      discardChapterChanges();
      queueMicrotask(() => reviewDraftGuard.syncContexts());
      return true;
    },
    onChange(details) {
      onChange?.({ ...details, primary: details.source === select });
    }
  });
  reviewDraftGuard = mountPodcastReviewDraftGuard({
    showSelects: [...root.querySelectorAll("[data-podcast-show-select]")],
    transcriptEpisodeSelect: query("[data-podcast-transcript-episode]"),
    transcriptLanguageSelect: query("[data-podcast-transcript-language]"),
    chapterEpisodeSelect: query("[data-podcast-chapter-episode]"),
    logoutButton: query("[data-podcast-logout]"),
    hasTranscriptChanges,
    hasChapterChanges,
    discardTranscriptChanges,
    discardChapterChanges,
    loadTranscript,
    loadChapters,
    message: () => text("discardUnsavedReviewChanges")
  });
  const managedContext = Object.freeze({
    ...context,
    selectEpisode(episodeId, options) {
      if (!context.selectEpisode(episodeId, options)) return false;
      revealEpisodePublishWorkflow(
        root.querySelector("[data-podcast-publish-workflow]")
      );
      return true;
    }
  });
  return Object.freeze({
    context: managedContext,
    reviewDraftGuard,
    select
  });
}
