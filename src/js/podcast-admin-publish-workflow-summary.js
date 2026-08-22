export function episodeWorkflowSummary(derived, readiness) {
  if (!readiness) return { key: "workflowLoading", values: {} };
  if (readiness.candidateGate?.ready) {
    return { key: "workflowReadySummary", values: {} };
  }
  if (
    derived.waitingForAutomation
    && derived.actionableBlockers.length === 0
  ) {
    return { key: "workflowProcessingSummary", values: {} };
  }
  if (
    derived.actionableBlockers.length === 0
    && derived.incompleteSteps.length > 0
  ) {
    return {
      key: "workflowIncompleteSummary",
      values: { count: derived.incompleteSteps.length }
    };
  }
  return {
    key: "workflowNeedsActionSummary",
    values: { count: derived.actionableBlockers.length }
  };
}
