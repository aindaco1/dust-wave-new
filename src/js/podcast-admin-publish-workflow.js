import { mountWorkflowProgress } from "./dust-wave-admin-shell/workflow-progress.js?v=0.9.0";
import {
  deriveEpisodeWorkflow,
  workflowStepForNode
} from "./podcast-admin-publish-workflow-core.js";

export function mountEpisodePublishWorkflow({
  root,
  client,
  text,
  nodeLabel,
  onNavigate,
  onPublish
}) {
  if (!root?.ownerDocument) {
    throw new TypeError("An episode publish-workflow root is required");
  }
  const document = root.ownerDocument;
  const heading = document.createElement("div");
  heading.className = "podcast-admin__panel-heading";
  const headingCopy = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = text("publishWorkflowHeading");
  const intro = document.createElement("p");
  intro.textContent = text("publishWorkflowIntro");
  headingCopy.append(title, intro);
  const refreshButton = document.createElement("button");
  refreshButton.className = "btn btn-outline-light";
  refreshButton.type = "button";
  refreshButton.textContent = text("refreshReadiness");
  heading.append(headingCopy, refreshButton);

  const episodeLabel = document.createElement("label");
  episodeLabel.className = "podcast-admin__workflow-episode";
  episodeLabel.append(document.createTextNode(text("workflowEpisode")));
  const select = document.createElement("select");
  select.name = "workflowEpisodeId";
  select.dataset.podcastWorkflowEpisode = "";
  episodeLabel.append(select);
  const progressRoot = document.createElement("div");
  const summary = document.createElement("p");
  summary.className = "podcast-admin__workflow-summary";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-live", "polite");
  const blockers = document.createElement("ul");
  blockers.className = "podcast-admin__workflow-blockers";
  const actions = document.createElement("div");
  actions.className =
    "podcast-admin__form-actions podcast-admin__workflow-actions";
  const continueButton = document.createElement("button");
  continueButton.className = "btn btn-danger";
  continueButton.type = "button";
  const publishButton = document.createElement("button");
  publishButton.className = "btn btn-danger";
  publishButton.type = "button";
  publishButton.textContent = text("publishReviewedEpisode");
  publishButton.hidden = true;
  actions.append(continueButton, publishButton);
  root.append(
    heading,
    episodeLabel,
    progressRoot,
    summary,
    blockers,
    actions
  );

  const stepDefinitions = [
    ["details", text("workflowDetails")],
    ["media", text("workflowMedia")],
    ["transcript", text("workflowTranscript")],
    ["monetization", text("workflowMonetization")],
    ["review", text("workflowReview")],
    ["publish", text("workflowPublish")]
  ];
  const progress = mountWorkflowProgress(progressRoot, {
    label: text("publishWorkflowAria"),
    labels: {
      complete: text("workflowStatusComplete"),
      ready: text("workflowStatusReady"),
      needs_action: text("workflowStatusNeedsAction"),
      optional: text("workflowStatusOptional"),
      not_started: text("workflowStatusNotStarted")
    },
    onSelect: (id) => navigate(id)
  });
  let episodes = [];
  let readiness = null;
  let requestId = 0;
  let nextStep = "details";

  function selectedEpisode() {
    return episodes.find(({ id }) => String(id) === select.value) || null;
  }

  function navigate(id) {
    const episode = selectedEpisode();
    if (!episode) return;
    progress.setActive(id);
    onNavigate?.(id, episode);
  }

  function render() {
    const episode = selectedEpisode();
    root.hidden = !episode;
    if (!episode) return;
    const derived = deriveEpisodeWorkflow(episode, readiness);
    const steps = derived.steps.map((step) => ({
      ...step,
      label: stepDefinitions.find(([id]) => id === step.id)?.[1] || step.id
    }));
    progress.setSteps(steps);
    nextStep = derived.nextStep;
    continueButton.textContent = text("continueWorkflow", {
      step: stepDefinitions.find(([id]) => id === nextStep)?.[1] || ""
    });
    continueButton.hidden = nextStep === "publish";
    publishButton.hidden = nextStep !== "publish";
    publishButton.disabled = !readiness;
    const blockerNodes = derived.blockers;
    if (!readiness) {
      summary.textContent = text("workflowLoading");
    } else if (readiness.candidateGate?.ready) {
      summary.textContent = text("workflowReadySummary");
    } else {
      summary.textContent = text("workflowNeedsActionSummary", {
        count: Math.max(
          blockerNodes.length,
          Number(readiness.candidateGate?.blockerCount || 0)
        )
      });
    }
    blockers.replaceChildren(...blockerNodes.map((node) => {
      const item = document.createElement("li");
      const copy = document.createElement("span");
      copy.textContent = nodeLabel(node);
      const fix = document.createElement("button");
      fix.className = "btn btn-outline-light";
      fix.type = "button";
      fix.textContent = text("fixWorkflowIssue");
      fix.addEventListener(
        "click",
        () => navigate(workflowStepForNode(node))
      );
      item.append(copy, fix);
      return item;
    }));
    blockers.hidden = blockerNodes.length === 0;
  }

  async function refresh() {
    const episode = selectedEpisode();
    if (!episode) {
      readiness = null;
      render();
      return;
    }
    const currentRequest = ++requestId;
    readiness = null;
    render();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episode.id)}/readiness`
      );
      if (currentRequest !== requestId || episode.id !== select.value) return;
      readiness = payload;
      render();
    } catch {
      if (currentRequest !== requestId) return;
      summary.textContent = text("readinessFailed");
      blockers.replaceChildren();
      blockers.hidden = true;
    }
  }

  select.addEventListener("change", refresh);
  refreshButton.addEventListener("click", refresh);
  continueButton.addEventListener("click", () => navigate(nextStep));
  publishButton.addEventListener("click", async () => {
    const episode = selectedEpisode();
    if (!episode || publishButton.disabled) return;
    await onPublish?.(episode.id, publishButton);
    await refresh();
  });

  return {
    setEpisodes(nextEpisodes) {
      const previous = select.value;
      episodes = Array.from(nextEpisodes || []);
      select.replaceChildren(...episodes.map((episode) => {
        const option = document.createElement("option");
        option.value = String(episode.id);
        option.textContent = String(episode.title || "");
        option.selected = episode.id === previous;
        return option;
      }));
      if (!select.value && episodes[0]) select.value = episodes[0].id;
      refresh();
    },
    selectEpisode(episodeId) {
      if (!episodes.some(({ id }) => String(id) === String(episodeId))) {
        return false;
      }
      select.value = String(episodeId);
      refresh();
      const reduceMotion = document.defaultView
        ?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      root.scrollIntoView?.({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
      return true;
    },
    refresh,
    destroy() {
      requestId += 1;
      progress.destroy();
      root.replaceChildren();
    }
  };
}
