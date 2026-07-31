const MINIMUM_LAUNCH_DIRECTORIES = 10;
const MAXIMUM_INSET_DELTA_PX = 1;

export function assertPodcastAdminSpacingContract(observed) {
  if (!observed?.authenticatedAdmin) return;
  if (!Array.isArray(observed.listItemMarginViolations)) {
    throw new Error(
      "Podcast admin trace could not inspect list-item inline spacing."
    );
  }
  if (observed.listItemMarginViolations.length > 0) {
    throw new Error(
      "Podcast admin list items must use their component spacing instead of "
      + "inheriting one-sided editorial margins. "
      + JSON.stringify(observed.listItemMarginViolations)
    );
  }
}

export function assertPodcastAdminTraceContract(observed, { adminTab } = {}) {
  if (adminTab !== "distribution") return;
  if (!observed?.authenticatedAdmin) {
    throw new Error(
      "Distribution trace requires an authenticated Podcast admin session."
    );
  }

  const distribution = observed.distribution;
  if (!distribution?.guidancePresent) {
    throw new Error(
      "Distribution trace did not find the progressive operating guidance."
    );
  }
  if (distribution.guidanceOpen !== false) {
    throw new Error(
      "Distribution operating guidance must remain collapsed by default."
    );
  }
  if (
    !Number.isInteger(distribution.directoryCount)
    || distribution.directoryCount < MINIMUM_LAUNCH_DIRECTORIES
  ) {
    throw new Error(
      "Distribution trace found fewer than 10 launch directories. "
      + `Observed ${distribution.directoryCount ?? "unknown"}. `
      + `Rendered status: ${distribution.statusText || "empty"}.`
    );
  }
  if (!Number.isInteger(distribution.actionableDirectoryCount)) {
    throw new Error(
      "Distribution trace could not determine actionable directories."
    );
  }
  const expectedOpenCount = distribution.actionableDirectoryCount > 0 ? 1 : 0;
  if (
    !Number.isInteger(distribution.openDirectoryCount)
    || distribution.openDirectoryCount !== expectedOpenCount
  ) {
    throw new Error(
      "Distribution must initially open only the first actionable directory. "
      + `Observed ${distribution.openDirectoryCount ?? "unknown"}.`
    );
  }
  if (
    !Number.isInteger(distribution.summaryCount)
    || distribution.summaryCount !== distribution.directoryCount
  ) {
    throw new Error(
      "Every distribution directory must expose compact proof progress in "
      + "its collapsed summary."
    );
  }
  const inset = distribution.certificationRowInset;
  if (
    !Number.isFinite(inset?.start)
    || !Number.isFinite(inset?.end)
    || Math.abs(inset.start) > MAXIMUM_INSET_DELTA_PX
    || Math.abs(inset.end) > MAXIMUM_INSET_DELTA_PX
  ) {
    throw new Error(
      "Distribution certification rows must share the expanded card's "
      + "horizontal inset. "
      + `Observed ${JSON.stringify(inset)}.`
    );
  }
}

export function podcastAdminTraceContractSummary(observed, { adminTab } = {}) {
  if (adminTab !== "distribution" || !observed?.authenticatedAdmin) return null;
  const distribution = observed.distribution;
  return `Distribution contract: ${distribution.openDirectoryCount} of `
    + `${distribution.directoryCount} directories open; guidance collapsed.`;
}
