import {
  episodeWorkflowNodeIsAutomaticWait,
  episodeWorkflowNodeIsComplete,
  episodeWorkflowNodeIsProviderDelay,
  episodeWorkflowNodeRequiresAction
} from "./podcast-admin-autopilot-core.js";

const STEP_NODES = Object.freeze({
  details: ["core_metadata", "core_release_window"],
  media: ["core_working_master", "core_delivery_audio"],
  transcript: [
    "editorial_primary_transcript",
    "editorial_bilingual_transcripts",
    "editorial_word_alignment",
    "editorial_chapters"
  ],
  monetization: ["monetization_dynamic_ads"],
  review: [
    "editorial_production_review",
    "editorial_promotion_clips"
  ]
});

const NODE_TARGETS = Object.freeze({
  core_working_master: "working_master",
  core_delivery_audio: "delivery_audio",
  editorial_primary_transcript: "transcript",
  editorial_bilingual_transcripts: "transcript",
  editorial_word_alignment: "alignment",
  editorial_chapters: "chapters",
  monetization_dynamic_ads: "monetization",
  editorial_production_review: "production_review",
  editorial_promotion_clips: "promotion_clips"
});

function nodeKey(node) {
  return String(node?.id || node?.key || "")
    .replace(/^readinessNode_/u, "")
    .replace(/[.\s-]+/gu, "_");
}

export function workflowStepForNode(node) {
  const key = nodeKey(node);
  return Object.entries(STEP_NODES).find(([, keys]) => keys.includes(key))
    ?.[0] || "review";
}

export function workflowTargetForNode(node) {
  return NODE_TARGETS[nodeKey(node)] || workflowStepForNode(node);
}

function unresolvedBlocker(node) {
  return node?.severity === "blocker"
    && !episodeWorkflowNodeIsComplete(node);
}

function launchRequirement(node) {
  return !node?.severity || node.severity === "blocker";
}

function stepStatus(id, episode, nodes, readiness) {
  let episodeEvidenceComplete = false;
  if (id === "details") {
    episodeEvidenceComplete = [
      episode?.title,
      episode?.summary,
      episode?.sourceLanguage
    ].every((value) => String(value || "").trim());
    if (!episodeEvidenceComplete) return "needs_action";
  }
  if (id === "media") {
    episodeEvidenceComplete = episode?.mediaStatus === "ready";
    if (episode?.mediaStatus === "processing") return "processing";
    if (!episodeEvidenceComplete) return "needs_action";
  }
  if (id === "publish") {
    if (
      episode?.status === "published"
      || Number(episode?.publicationRevision || 0) > 0
    ) return "complete";
    if (readiness?.candidateGate?.ready) return "ready";
    const unresolved = nodes.filter(unresolvedBlocker);
    return unresolved.length > 0
      && unresolved.every((node) => !episodeWorkflowNodeRequiresAction(node))
      ? "processing"
      : "needs_action";
  }
  const keys = STEP_NODES[id] || [];
  const relevant = nodes.filter((node) => keys.includes(nodeKey(node)));
  if (!relevant.length) {
    if (episodeEvidenceComplete) return "complete";
    return id === "monetization" ? "optional" : "not_started";
  }
  const required = relevant.filter(launchRequirement);
  if (!required.length) return "optional";
  if (required.every((node) => String(node.status) === "not_applicable")) {
    return "optional";
  }
  if (required.every(episodeWorkflowNodeIsComplete)) return "complete";
  if (required.some(episodeWorkflowNodeRequiresAction)) return "needs_action";
  return required.some((node) =>
    episodeWorkflowNodeIsAutomaticWait(node)
    || episodeWorkflowNodeIsProviderDelay(node)
  ) ? "processing" : "needs_action";
}

export function deriveEpisodeWorkflow(episode, readiness) {
  const nodes = Array.isArray(readiness?.nodes) ? readiness.nodes : [];
  const ids = [
    "details",
    "media",
    "transcript",
    "monetization",
    "review",
    "publish"
  ];
  const steps = ids.map((id) => ({
    id,
    status: stepStatus(id, episode, nodes, readiness)
  }));
  const firstIncomplete = steps.find(({ id, status }) =>
    id !== "publish" && ["needs_action", "processing"].includes(status)
  );
  const blockers = nodes.filter(unresolvedBlocker);
  const actionableBlockers = blockers.filter(
    episodeWorkflowNodeRequiresAction
  );
  const nextStep = firstIncomplete?.id
    || (readiness?.candidateGate?.ready ? "publish" : "review");
  const currentStepBlockers = blockers.filter((node) =>
    workflowStepForNode(node) === nextStep
  );
  const nextBlocker = currentStepBlockers.find(
    episodeWorkflowNodeRequiresAction
  ) || (!currentStepBlockers.length
    ? blockers.find(episodeWorkflowNodeRequiresAction)
    : null) || null;
  const waitingForAutomation = currentStepBlockers.some((node) =>
    episodeWorkflowNodeIsAutomaticWait(node)
    || episodeWorkflowNodeIsProviderDelay(node)
  ) || (
    nextStep === "media"
    && episode?.mediaStatus === "processing"
  );
  return {
    blockers,
    actionableBlockers,
    nextBlocker,
    nextStep,
    nextTarget: nextBlocker ? workflowTargetForNode(nextBlocker) : "",
    waitingForAutomation,
    steps
  };
}
