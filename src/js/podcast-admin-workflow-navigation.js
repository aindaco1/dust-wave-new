function selectEpisode(control, episodeId) {
  if (!control || !episodeId) return;
  control.value = String(episodeId);
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function reveal(target, document) {
  let disclosure = target?.closest?.("details") || null;
  while (disclosure) {
    disclosure.setAttribute("open", "");
    disclosure = disclosure.parentElement?.closest?.("details") || null;
  }
  queueMicrotask(() => {
    const reduceMotion = document.defaultView
      ?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
    const focusTarget = target?.matches?.("button, input, select, textarea")
      ? target
      : target?.querySelector?.("button, input, select, textarea");
    focusTarget?.focus?.({ preventScroll: true });
  });
}

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

  return function navigateEpisodeWorkflow(step, episode) {
    const episodeId = String(episode?.id || "");
    if (!episodeId) return;
    if (step === "details") {
      tabs.select("episodes");
      const escapedId = document.defaultView.CSS.escape(episodeId);
      episodeList?.querySelector(`[data-edit-episode="${escapedId}"]`)
        ?.click();
      reveal(episodeForm, document);
      return;
    }
    if (step === "monetization") {
      tabs.select("episodes");
      selectEpisode(adPlanForm?.elements.episodeId, episodeId);
      reveal(adPlanForm, document);
      return;
    }
    if (step === "publish") {
      tabs.select("episodes");
      reveal(root.querySelector("[data-podcast-publish-workflow]"), document);
      return;
    }

    tabs.select("episodes");
    if (step === "media") {
      selectEpisode(audioQcEpisodeSelect, episodeId);
      selectEpisode(audioMasterEpisodeSelect, episodeId);
      reveal(
        audioQcEpisodeSelect?.closest(".podcast-admin__form, section"),
        document
      );
      return;
    }
    if (step === "transcript") {
      selectEpisode(transcriptEpisodeSelect, episodeId);
      selectEpisode(chapterEpisodeSelect, episodeId);
      reveal(transcriptWorkbench, document);
      return;
    }
    selectEpisode(reviewEpisodeSelect, episodeId);
    loadProductionReviews();
    loadPublicationReadiness(episodeId);
    reveal(
      root.querySelector("[data-podcast-publication-readiness]"),
      document
    );
  };
}
