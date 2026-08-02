const MINIMUM_LAUNCH_DIRECTORIES = 10;
const MAXIMUM_INSET_DELTA_PX = 1;
export const PODCAST_ADMIN_TRACE_TABS = Object.freeze([
  "episodes",
  "distribution",
  "marketing",
  "audience",
  "monetization",
  "settings"
]);
const EXPECTED_OPEN_GROUPS = Object.freeze({
  episodes: [],
  distribution: [],
  marketing: [],
  audience: ["analytics"],
  monetization: ["sponsors"],
  settings: []
});

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
  if (adminTab === "settings") {
    assertLaunchLabContract(observed);
    return;
  }
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

function assertLaunchLabContract(observed) {
  if (!observed?.authenticatedAdmin) {
    throw new Error(
      "Settings trace requires an authenticated Podcast admin session."
    );
  }
  const launchLab = observed.launchLab;
  if (!launchLab?.visible) {
    throw new Error(
      "Settings trace did not render the super-admin Launch Lab evidence."
    );
  }
  if (launchLab.metricCount !== 4) {
    throw new Error(
      "Launch Lab must present exactly four aggregate state metrics before "
      + `technical evidence. Observed ${launchLab.metricCount ?? "unknown"}.`
    );
  }
  if (launchLab.providerCount !== 7) {
    throw new Error(
      "Launch Lab must group the checked provider matrix into seven concise "
      + `sections. Observed ${launchLab.providerCount ?? "unknown"}.`
    );
  }
  if (launchLab.evidenceOpen !== false || launchLab.openProviderCount !== 0) {
    throw new Error(
      "Launch Lab technical evidence must remain collapsed by default."
    );
  }
}

export function assertPodcastAdminTabMatrixContract(observations) {
  if (!Array.isArray(observations)) {
    throw new Error("Podcast admin tab matrix was not measured.");
  }
  const measuredTabs = observations.map(({ activeTab }) => activeTab);
  if (
    observations.length !== PODCAST_ADMIN_TRACE_TABS.length
    || PODCAST_ADMIN_TRACE_TABS.some(
      (tab, index) => measuredTabs[index] !== tab
    )
  ) {
    throw new Error(
      "Podcast admin tab matrix must audit every workspace once in "
      + "navigation order. "
      + `Observed ${JSON.stringify(measuredTabs)}.`
    );
  }
  const signedOutTab = observations.find(
    ({ authenticatedAdmin }) => authenticatedAdmin !== true
  );
  if (signedOutTab) {
    throw new Error(
      "Podcast admin tab matrix requires an authenticated session for every "
      + `workspace. Signed-out tab: ${signedOutTab.activeTab || "unknown"}.`
    );
  }
  for (const observation of observations) {
    const expectedGroups = EXPECTED_OPEN_GROUPS[observation.activeTab];
    if (
      !Array.isArray(observation.activeGroups)
      || JSON.stringify(observation.activeGroups)
        !== JSON.stringify(expectedGroups)
    ) {
      throw new Error(
        "Podcast admin workspaces must progressively disclose only their "
        + "primary operating group. "
        + `${observation.activeTab}: expected ${JSON.stringify(expectedGroups)}, `
        + `observed ${JSON.stringify(observation.activeGroups)}.`
      );
    }
  }
}

export function podcastAdminTraceContractSummary(observed, { adminTab } = {}) {
  if (adminTab === "all") {
    const tabs = Array.isArray(observed?.tabMatrix)
      ? observed.tabMatrix.map(({ activeTab }) => activeTab)
      : [];
    return `Admin tab matrix: ${tabs.length} workspaces audited (`
      + `${tabs.join(", ")}).`;
  }
  if (adminTab === "settings" && observed?.authenticatedAdmin) {
    return `Launch Lab contract: ${observed.launchLab.metricCount} metrics; `
      + `${observed.launchLab.providerCount} provider groups collapsed.`;
  }
  if (adminTab !== "distribution" || !observed?.authenticatedAdmin) return null;
  const distribution = observed.distribution;
  return `Distribution contract: ${distribution.openDirectoryCount} of `
    + `${distribution.directoryCount} directories open; guidance collapsed.`;
}
