import { mountWorkflowProgress } from "./dust-wave-admin-shell/workflow-progress.js?v=0.10.2";
import {
  deriveEpisodeWorkflow,
  workflowStepForNode,
  workflowTargetForNode
} from "./podcast-admin-publish-workflow-core.js";
import {
  episodeWorkflowSummary
} from "./podcast-admin-publish-workflow-summary.js";
import {
  mountWorkflowPriority
} from "./podcast-admin-workflow-priority.js?v=0.2.0";
import { mountEpisodeAutopilot } from "./podcast-admin-autopilot.js";
import {
  mountWorkflowResponsiveSelect
} from "./podcast-admin-workflow-responsive.js";

export function mountEpisodePublishWorkflow({
  root,
  client,
  text,
  nodeLabel,
  nodeDescription,
  episodeSelect,
  loadReadiness,
  onEpisodePresence,
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
  heading.append(headingCopy);

  const select = episodeSelect || document.createElement("select");
  let episodeLabel = null;
  if (!episodeSelect) {
    episodeLabel = document.createElement("label");
    episodeLabel.className = "podcast-admin__workflow-episode";
    episodeLabel.append(document.createTextNode(text("workflowEpisode")));
    select.name = "workflowEpisodeId";
    select.dataset.podcastWorkflowEpisode = "";
    episodeLabel.append(select);
  }
  const progressRoot = document.createElement("div");
  progressRoot.className = "podcast-admin__workflow-menu";
  const publishPanel = document.createElement("section");
  publishPanel.className = "podcast-admin__workflow-panel";
  publishPanel.dataset.podcastWorkflowPublishPanel = "";
  const blockerNavigation = document.createElement("section");
  blockerNavigation.className =
    "podcast-admin__workflow-blocker-navigation";
  blockerNavigation.dataset.podcastWorkflowBlockers = "";
  const summary = document.createElement("p");
  summary.className = "podcast-admin__workflow-summary";
  summary.id = "podcast-publish-blocker-summary";
  summary.setAttribute("role", "status");
  summary.setAttribute("aria-live", "polite");
  blockerNavigation.setAttribute("aria-labelledby", summary.id);
  const actions = document.createElement("div");
  actions.className =
    "podcast-admin__form-actions podcast-admin__workflow-actions";
  const publishButton = document.createElement("button");
  publishButton.className = "btn btn-danger";
  publishButton.type = "button";
  publishButton.textContent = text("publishReviewedEpisode");
  publishButton.hidden = true;
  actions.append(publishButton);
  const workflowPriority = mountWorkflowPriority({
    document,
    nodeLabel,
    nodeDescription,
    nodeStep: workflowStepForNode,
    onNavigate(node) {
      navigate(
        workflowStepForNode(node),
        workflowTargetForNode(node)
      );
    }
  });
  const autopilot = mountEpisodeAutopilot({ document, text });
  root.append(heading);
  if (episodeLabel) root.append(episodeLabel);
  blockerNavigation.append(summary, ...workflowPriority.elements);
  publishPanel.append(
    autopilot.element,
    actions
  );
  root.append(progressRoot, blockerNavigation, publishPanel);

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
      not_started: text("workflowStatusNotStarted"),
      processing: text("workflowStatusProcessing")
    },
    selectionMode: "tabs",
    onSelect: (id) => navigate(id)
  });
  const responsiveProgress = mountWorkflowResponsiveSelect(progressRoot, {
    label: text("publishWorkflowAria"),
    onSelect: (id) => navigate(id)
  });
  let episodes = [];
  let readiness = null;
  let requestId = 0;
  let nextStep = "details";
  let hasSelectedEpisode = null;

  function selectedEpisode() {
    return episodes.find(({ id }) => String(id) === select.value) || null;
  }

  function navigate(id, target = "") {
    const episode = selectedEpisode();
    if (!episode) return;
    progress.setActive(id);
    responsiveProgress.sync(id);
    onNavigate?.(id, episode, target);
    void refresh();
  }

  function render() {
    const episode = selectedEpisode();
    root.hidden = !episode;
    if (hasSelectedEpisode !== Boolean(episode)) {
      hasSelectedEpisode = Boolean(episode);
      onEpisodePresence?.(hasSelectedEpisode);
    }
    if (!episode) return;
    const derived = deriveEpisodeWorkflow(episode, readiness);
    const steps = derived.steps.map((step) => ({
      ...step,
      label: stepDefinitions.find(([id]) => id === step.id)?.[1] || step.id
    }));
    progress.setSteps(steps);
    responsiveProgress.refresh({ activeValue: progress.getActive() });
    nextStep = derived.nextStep;
    blockerNavigation.dataset.podcastWorkflowReadiness = readiness
      ? "loaded"
      : "loading";
    blockerNavigation.dataset.podcastWorkflowBlockerCount = String(
      derived.actionableBlockers.length
    );
    publishButton.hidden = nextStep !== "publish";
    actions.hidden = publishButton.hidden;
    publishButton.disabled = !readiness;
    const summaryCopy = episodeWorkflowSummary(derived, readiness);
    summary.textContent = text(summaryCopy.key, summaryCopy.values);
    workflowPriority.render({
      nodes: derived.actionableBlockers
    });
    autopilot.render(readiness);
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
      const payload = loadReadiness
        ? await loadReadiness(episode.id)
        : await client.request(
          `/v1/admin/episodes/${encodeURIComponent(episode.id)}/readiness`
        );
      if (!payload) throw new Error("Readiness is unavailable");
      if (currentRequest !== requestId || episode.id !== select.value) return;
      readiness = payload;
      render();
    } catch {
      if (currentRequest !== requestId) return;
      blockerNavigation.dataset.podcastWorkflowReadiness = "failed";
      summary.textContent = text("readinessFailed");
      workflowPriority.clear();
      autopilot.render({
        candidateGate: { ready: false },
        nodes: [{ status: "failed", severity: "blocker" }]
      });
    }
  }

  const handleEpisodeChange = () => refresh();
  if (!episodeSelect) select.addEventListener("change", handleEpisodeChange);
  publishButton.addEventListener("click", async () => {
    const episode = selectedEpisode();
    if (!episode || publishButton.disabled) return;
    await onPublish?.(episode.id, publishButton);
    await refresh();
  });

  return {
    publishPanel,
    setEpisodes(nextEpisodes) {
      const previous = select.value;
      episodes = Array.from(nextEpisodes || []);
      if (!episodeSelect) {
        select.replaceChildren(...episodes.map((episode) => {
          const option = document.createElement("option");
          option.value = String(episode.id);
          option.textContent = String(episode.title || "");
          option.selected = episode.id === previous;
          return option;
        }));
      }
      if (!select.value && episodes[0]) select.value = episodes[0].id;
      refresh();
    },
    refresh,
    destroy() {
      requestId += 1;
      if (!episodeSelect) {
        select.removeEventListener("change", handleEpisodeChange);
      }
      progress.destroy();
      responsiveProgress.destroy();
      root.replaceChildren();
    }
  };
}
