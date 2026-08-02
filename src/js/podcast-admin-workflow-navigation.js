import {
  createExactWorkflowNavigator,
  revealWorkflowTarget,
  selectWorkflowEpisode
} from "./podcast-admin-workflow-target.js";

export function createEpisodeWorkflowNavigator({
  root,
  tabs,
  editEpisode,
  adPlanForm,
  audioQcEpisodeSelect,
  audioMasterEpisodeSelect,
  transcriptEpisodeSelect,
  chapterEpisodeSelect,
  reviewEpisodeSelect,
  loadProductionReviews,
  loadPublicationReadiness,
  publishSections
}) {
  if (!root?.ownerDocument || !tabs?.select) {
    throw new TypeError("Workflow root and tabs are required");
  }
  const document = root.ownerDocument;
  const navigateExactTarget = createExactWorkflowNavigator(root);

  return function navigateEpisodeWorkflow(step, episode, target = "") {
    const episodeId = String(episode?.id || "");
    if (!episodeId) return;
    publishSections?.select(step);
    if (step === "details") {
      tabs.select("episodes");
      editEpisode?.(episodeId, { focus: false, scroll: false });
      return;
    }
    if (step === "monetization") {
      tabs.select("episodes");
      selectWorkflowEpisode(adPlanForm?.elements.episodeId, episodeId);
      if (target) revealWorkflowTarget(adPlanForm, document);
      return;
    }
    if (step === "publish") {
      tabs.select("episodes");
      return;
    }

    tabs.select("episodes");
    if (step === "media") {
      if (target && navigateExactTarget(target, episodeId)) return;
      selectWorkflowEpisode(audioQcEpisodeSelect, episodeId);
      selectWorkflowEpisode(audioMasterEpisodeSelect, episodeId);
      return;
    }
    if (step === "transcript") {
      if (target && navigateExactTarget(target, episodeId)) return;
      selectWorkflowEpisode(transcriptEpisodeSelect, episodeId);
      selectWorkflowEpisode(chapterEpisodeSelect, episodeId);
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
  };
}
