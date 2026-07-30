import {
  createExactWorkflowNavigator,
  revealWorkflowTarget,
  selectWorkflowEpisode
} from "./podcast-admin-workflow-target.js";

export function createEpisodeWorkflowNavigator({
  root,
  tabs,
  episodeList,
  episodeForm,
  adPlanForm,
  audioQcEpisodeSelect,
  audioMasterEpisodeSelect,
  transcriptEpisodeSelect,
  chapterEpisodeSelect,
  transcriptWorkbench,
  reviewEpisodeSelect,
  loadProductionReviews,
  loadPublicationReadiness
}) {
  if (!root?.ownerDocument || !tabs?.select) {
    throw new TypeError("Workflow root and tabs are required");
  }
  const document = root.ownerDocument;
  const readinessWorkbench = root.querySelector(
    "[data-podcast-publication-readiness]"
  );
  const navigateExactTarget = createExactWorkflowNavigator(root);

  return function navigateEpisodeWorkflow(step, episode, target = "") {
    const episodeId = String(episode?.id || "");
    if (!episodeId) return;
    if (step === "details") {
      tabs.select("episodes");
      const escapedId = document.defaultView.CSS.escape(episodeId);
      episodeList?.querySelector(`[data-edit-episode="${escapedId}"]`)
        ?.click();
      revealWorkflowTarget(episodeForm, document);
      return;
    }
    if (step === "monetization") {
      tabs.select("episodes");
      selectWorkflowEpisode(adPlanForm?.elements.episodeId, episodeId);
      revealWorkflowTarget(adPlanForm, document);
      return;
    }
    if (step === "publish") {
      tabs.select("episodes");
      revealWorkflowTarget(
        root.querySelector("[data-podcast-publish-workflow]"),
        document
      );
      return;
    }

    tabs.select("episodes");
    if (step === "media") {
      const exactTarget = target || (
        episode?.mediaStatus !== "ready" ? "attach_media" : ""
      );
      if (exactTarget && navigateExactTarget(exactTarget, episodeId)) return;
      selectWorkflowEpisode(audioQcEpisodeSelect, episodeId);
      selectWorkflowEpisode(audioMasterEpisodeSelect, episodeId);
      revealWorkflowTarget(
        audioQcEpisodeSelect?.closest(".podcast-admin__form, section"),
        document
      );
      return;
    }
    if (step === "transcript") {
      if (target && navigateExactTarget(target, episodeId)) return;
      selectWorkflowEpisode(transcriptEpisodeSelect, episodeId);
      selectWorkflowEpisode(chapterEpisodeSelect, episodeId);
      revealWorkflowTarget(transcriptWorkbench, document);
      return;
    }
    if (
      target === "promotion_clips"
      && navigateExactTarget(target, episodeId)
    ) return;
    selectWorkflowEpisode(reviewEpisodeSelect, episodeId);
    loadProductionReviews();
    loadPublicationReadiness(episodeId);
    if (target && navigateExactTarget(target, episodeId)) return;
    revealWorkflowTarget(readinessWorkbench, document);
  };
}
