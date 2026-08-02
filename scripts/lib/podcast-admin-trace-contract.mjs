const MINIMUM_LAUNCH_DIRECTORIES = 10;
const MAXIMUM_INSET_DELTA_PX = 1;
const MINIMUM_STACK_GAP_PX = 8;
const MAXIMUM_WORKFLOW_GAP_PX = 32;
const WORKFLOW_STEPS = new Set([
  "details",
  "media",
  "transcript",
  "monetization",
  "review",
  "publish"
]);
export const PODCAST_ADMIN_EPISODE_TRANSITIONS = Object.freeze([
  "details",
  "media",
  "transcript",
  "monetization",
  "review",
  "publish",
  "details"
]);
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
const EXPECTED_SECTION_SWITCHERS = Object.freeze({
  episodes: [],
  distribution: [],
  marketing: [{ name: "podcast-marketing-sections", tabCount: 4 }],
  audience: [{ name: "podcast-audience-sections", tabCount: 2 }],
  monetization: [{ name: "podcast-monetization-sections", tabCount: 2 }],
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
  if (!Array.isArray(observed.listActionGapViolations)) {
    throw new Error(
      "Podcast admin trace could not inspect list-to-action spacing."
    );
  }
  if (observed.listActionGapViolations.length > 0) {
    throw new Error(
      "Podcast admin list actions must preserve at least one 8px spacing "
      + "step from the preceding list. "
      + JSON.stringify(observed.listActionGapViolations)
    );
  }
}

export function assertPodcastAdminTraceContract(observed, { adminTab } = {}) {
  if (adminTab === "episodes") {
    assertEpisodeWorkflowContract(observed);
    return;
  }
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
  if (
    !Number.isFinite(distribution.certificationActionGap)
    || distribution.certificationActionGap < MINIMUM_STACK_GAP_PX
  ) {
    throw new Error(
      "Distribution actions must remain visually separated from the "
      + "certification checklist. "
      + `Observed ${distribution.certificationActionGap ?? "unknown"}px.`
    );
  }
}

function assertEpisodeWorkflowContract(observed) {
  if (!observed?.authenticatedAdmin) {
    throw new Error(
      "Episodes trace requires an authenticated Podcast admin session."
    );
  }
  const workflow = observed.episodeWorkflow;
  if (
    workflow?.activeStep !== "details"
    || workflow.stepCount !== 6
    || workflow.visibleControlledSectionCount !== 1
  ) {
    throw new Error(
      "Episode publishing must open one Details section behind its six-step "
      + `submenu. Observed ${JSON.stringify(workflow)}.`
    );
  }
  if (
    workflow.manualRefreshCount !== 0
    || workflow.formMode !== "edit"
    || !workflow.currentEpisodeId
    || workflow.titlePresent !== true
  ) {
    throw new Error(
      "Episode publishing must populate the current draft without manual "
      + `readiness or reveal actions. Observed ${JSON.stringify(workflow)}.`
    );
  }
  const usesResponsiveSelect = Number(observed.innerWidth) <= 900;
  if (
    workflow.responsiveSelectVisible !== usesResponsiveSelect
    || workflow.tabListVisible === usesResponsiveSelect
  ) {
    throw new Error(
      "Episode publishing must use one responsive select on narrow screens "
      + `and the six-step tab strip otherwise. Observed ${JSON.stringify(workflow)}.`
    );
  }
  if (!usesResponsiveSelect && (
    workflow.tabListWidth < 600
    || workflow.tabListHeight > 96
    || workflow.tabColumnCount !== 6
    || workflow.tabRowCount !== 1
  )) {
    throw new Error(
      "Episode publishing must keep all six Pool-style submenu items on one "
      + `compact desktop row. Observed ${JSON.stringify(workflow)}.`
    );
  }
  if (
    workflow.blockerNavigationVisible !== true
    || workflow.blockerReadinessState !== "loaded"
    || !Number.isInteger(workflow.blockerDeclaredCount)
    || workflow.blockerDeclaredCount < 0
    || !Number.isInteger(workflow.blockerLinkCount)
    || workflow.blockerLinkCount !== workflow.blockerDeclaredCount
    || !Array.isArray(workflow.blockerLinkSteps)
    || workflow.blockerLinkSteps.length !== workflow.blockerLinkCount
    || workflow.blockerLinkSteps.some((step) => !WORKFLOW_STEPS.has(step))
    || !Number.isFinite(workflow.blockerNavigationGap)
    || workflow.blockerNavigationGap < MINIMUM_STACK_GAP_PX
    || workflow.blockerNavigationGap > MAXIMUM_WORKFLOW_GAP_PX
  ) {
    throw new Error(
      "Episode publishing release blockers must sit directly below the "
      + "workflow submenu and "
      + "link every declared blocker to a valid owning section. "
      + `Observed ${JSON.stringify(workflow)}.`
    );
  }
  const transitions = workflow.transitions;
  if (
    !Array.isArray(transitions)
    || transitions.length !== PODCAST_ADMIN_EPISODE_TRANSITIONS.length
    || transitions.some((transition, index) => (
      transition.step !== PODCAST_ADMIN_EPISODE_TRANSITIONS[index]
      || transition.activeStep !== transition.step
      || transition.visibleCount < 1
      || transition.leakCount !== 0
      || transition.scrollDelta > 1
    ))
  ) {
    throw new Error(
      "Episode publishing must replace the previous section across every "
      + "submenu transition without scrolling. "
      + `Observed ${JSON.stringify(transitions)}.`
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
    const expectedSwitchers = EXPECTED_SECTION_SWITCHERS[
      observation.activeTab
    ];
    if (
      !Array.isArray(observation.sectionSwitchers)
      || observation.sectionSwitchers.length !== expectedSwitchers.length
    ) {
      throw new Error(
        "Podcast admin contextual submenus must appear only in the relevant "
        + `workspace. ${observation.activeTab}: expected `
        + `${expectedSwitchers.length}, observed `
        + `${observation.sectionSwitchers?.length ?? "unknown"}.`
      );
    }
    const usesResponsiveSelect = Number(observation.innerWidth) <= 900;
    for (const expected of expectedSwitchers) {
      const switcher = observation.sectionSwitchers.find(
        ({ name }) => name === expected.name
      );
      if (
        switcher?.tabCount !== expected.tabCount
        || switcher.selectedCount !== 1
        || switcher.visiblePanelCount !== 1
        || switcher.mobileSelectVisible !== usesResponsiveSelect
        || switcher.tabListVisible === usesResponsiveSelect
        || (!usesResponsiveSelect && switcher.tabRowCount !== 1)
      ) {
        throw new Error(
          "Podcast admin contextual submenus must keep one selected task, "
          + "one visible panel, one desktop row, and one responsive selector. "
          + `${observation.activeTab}: ${JSON.stringify(switcher)}.`
        );
      }
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
