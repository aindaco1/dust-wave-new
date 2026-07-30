const COMPLETE_STATUSES = new Set(["ready", "not_applicable"]);

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
    && !COMPLETE_STATUSES.has(String(node?.status || ""));
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
    if (!episodeEvidenceComplete) return "needs_action";
  }
  if (id === "publish") {
    if (
      episode?.status === "published"
      || Number(episode?.publicationRevision || 0) > 0
    ) return "complete";
    return readiness?.candidateGate?.ready ? "ready" : "needs_action";
  }
  const keys = STEP_NODES[id] || [];
  const relevant = nodes.filter((node) => keys.includes(nodeKey(node)));
  if (!relevant.length) {
    if (episodeEvidenceComplete) return "complete";
    return id === "monetization" ? "optional" : "not_started";
  }
  if (relevant.every((node) => String(node.status) === "not_applicable")) {
    return "optional";
  }
  return relevant.every((node) => COMPLETE_STATUSES.has(String(node.status)))
    ? "complete"
    : "needs_action";
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
    id !== "publish" && status === "needs_action"
  );
  return {
    blockers: nodes.filter(unresolvedBlocker),
    nextStep: firstIncomplete?.id
      || (readiness?.candidateGate?.ready ? "publish" : "review"),
    steps
  };
}
