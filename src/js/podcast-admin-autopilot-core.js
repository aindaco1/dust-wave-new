const COMPLETE_STATUSES = new Set(["ready", "not_applicable"]);
const APPROVAL_NODE_IDS = new Set([
  "editorial_chapters",
  "editorial_production_review"
]);

function nodeKey(node) {
  return String(node?.id || node?.key || "")
    .replace(/^readinessNode_/u, "")
    .replace(/[^A-Za-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

function nodeIsLaunchBlocking(node) {
  const severity = String(node?.severity || "blocker");
  return severity === "blocker";
}

export function episodeWorkflowNodeIsApprovalWait(node) {
  if (String(node?.status || "") !== "pending") return false;
  const key = nodeKey(node);
  if (key === "editorial_primary_transcript") {
    return String(node?.evidence?.transcriptStatus || "") === "needs_review";
  }
  if (key === "editorial_bilingual_transcripts") {
    const statuses = Object.values(node?.evidence?.transcriptStatuses || {});
    return statuses.some((status) => String(status) === "needs_review");
  }
  if (APPROVAL_NODE_IDS.has(key)) return true;
  if (key === "editorial_word_alignment") {
    return String(node?.evidence?.alignmentStatus || "") === "needs_review";
  }
  if (key === "monetization_dynamic_ads") {
    return String(node?.evidence?.planStatus || "") === "needs_review";
  }
  return false;
}

export function episodeWorkflowNodeIsProviderDelay(node) {
  return String(node?.status || "") === "pending"
    && String(node?.group || "") === "distribution";
}

export function episodeWorkflowNodeRequiresAction(node) {
  if (!nodeIsLaunchBlocking(node)) return false;
  const status = String(node?.status || "");
  return status === "missing"
    || status === "stale"
    || status === "failed"
    || episodeWorkflowNodeIsApprovalWait(node);
}

export function episodeWorkflowNodeIsAutomaticWait(node) {
  return String(node?.status || "") === "pending"
    && !episodeWorkflowNodeIsApprovalWait(node)
    && !episodeWorkflowNodeIsProviderDelay(node);
}

export function deriveEpisodeAutopilot(readiness) {
  if (!readiness) {
    return {
      state: "checking",
      runningWork: [],
      approvalWaits: [],
      providerDelays: [],
      terminalFailures: [],
      actionRequired: []
    };
  }

  const nodes = Array.isArray(readiness.nodes) ? readiness.nodes : [];
  const launchNodes = nodes.filter(nodeIsLaunchBlocking);
  const terminalFailures = launchNodes.filter(
    (node) => String(node?.status || "") === "failed"
  );
  const approvalWaits = launchNodes.filter(episodeWorkflowNodeIsApprovalWait);
  const providerDelays = launchNodes.filter(episodeWorkflowNodeIsProviderDelay);
  const runningWork = launchNodes.filter(episodeWorkflowNodeIsAutomaticWait);
  const actionRequired = launchNodes.filter((node) => {
    if (String(node?.severity || "") !== "blocker") return false;
    const status = String(node?.status || "");
    return ["missing", "stale"].includes(status);
  });

  let state = "ready";
  if (terminalFailures.length) state = "failed";
  else if (actionRequired.length) state = "needs_action";
  else if (approvalWaits.length) state = "awaiting_approval";
  else if (runningWork.length) state = "processing";
  else if (providerDelays.length) state = "provider_delay";
  else if (!readiness.candidateGate?.ready) state = "needs_action";

  return {
    state,
    runningWork,
    approvalWaits,
    providerDelays,
    terminalFailures,
    actionRequired
  };
}

export function episodeWorkflowNodeIsComplete(node) {
  return COMPLETE_STATUSES.has(String(node?.status || ""));
}
