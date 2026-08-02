import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPodcastAdminSpacingContract,
  assertPodcastAdminTabMatrixContract,
  assertPodcastAdminTraceContract,
  PODCAST_ADMIN_TRACE_TABS,
  podcastAdminTraceContractSummary
} from "../scripts/lib/podcast-admin-trace-contract.mjs";

function validObservation() {
  return {
    authenticatedAdmin: true,
    listItemMarginViolations: [],
    launchLab: {
      visible: true,
      metricCount: 4,
      providerCount: 7,
      evidenceOpen: false,
      openProviderCount: 0
    },
    distribution: {
      guidancePresent: true,
      guidanceOpen: false,
      directoryCount: 11,
      actionableDirectoryCount: 1,
      openDirectoryCount: 1,
      summaryCount: 11,
      certificationRowInset: { start: 0, end: 0 }
    }
  };
}

const TAB_GROUPS = Object.freeze({
  episodes: [],
  distribution: [],
  marketing: [],
  audience: ["analytics"],
  monetization: ["sponsors"],
  settings: []
});

function validTabMatrix() {
  return PODCAST_ADMIN_TRACE_TABS.map((activeTab) => ({
    activeTab,
    activeGroups: TAB_GROUPS[activeTab],
    authenticatedAdmin: true
  }));
}

test("accepts the concise authenticated Distribution contract", () => {
  const observed = validObservation();
  assert.doesNotThrow(() => assertPodcastAdminTraceContract(
    observed,
    { adminTab: "distribution" }
  ));
  assert.equal(
    podcastAdminTraceContractSummary(observed, { adminTab: "distribution" }),
    "Distribution contract: 1 of 11 directories open; guidance collapsed."
  );
});

test("accepts concise, collapsed Settings Launch Lab evidence", () => {
  const observed = validObservation();
  assert.doesNotThrow(() => assertPodcastAdminTraceContract(
    observed,
    { adminTab: "settings" }
  ));
  assert.equal(
    podcastAdminTraceContractSummary(observed, { adminTab: "settings" }),
    "Launch Lab contract: 4 metrics; 7 provider groups collapsed."
  );
});

for (const [name, mutate, message] of [
  [
    "missing Launch Lab",
    (observed) => { observed.launchLab.visible = false; },
    /did not render the super-admin Launch Lab/
  ],
  [
    "extra aggregate metric",
    (observed) => { observed.launchLab.metricCount = 5; },
    /exactly four aggregate state metrics/
  ],
  [
    "missing provider group",
    (observed) => { observed.launchLab.providerCount = 6; },
    /seven concise sections/
  ],
  [
    "expanded provider evidence",
    (observed) => { observed.launchLab.evidenceOpen = true; },
    /must remain collapsed by default/
  ]
]) {
  test(`fails closed for Settings ${name}`, () => {
    const observed = validObservation();
    mutate(observed);
    assert.throws(
      () => assertPodcastAdminTraceContract(
        observed,
        { adminTab: "settings" }
      ),
      message
    );
  });
}

test("accepts component-owned admin list spacing", () => {
  assert.doesNotThrow(() => assertPodcastAdminSpacingContract(
    validObservation()
  ));
});

test("accepts one authenticated observation for every admin workspace", () => {
  const observations = validTabMatrix();
  assert.doesNotThrow(() => assertPodcastAdminTabMatrixContract(observations));
  assert.equal(
    podcastAdminTraceContractSummary(
      { tabMatrix: observations },
      { adminTab: "all" }
    ),
    "Admin tab matrix: 6 workspaces audited (episodes, distribution, "
      + "marketing, audience, monetization, settings)."
  );
});

test("rejects incomplete, reordered, and signed-out admin matrices", () => {
  assert.throws(
    () => assertPodcastAdminTabMatrixContract(validTabMatrix().slice(0, -1)),
    /every workspace once in navigation order/
  );
  const reordered = validTabMatrix();
  [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
  assert.throws(
    () => assertPodcastAdminTabMatrixContract(reordered),
    /every workspace once in navigation order/
  );
  const signedOut = validTabMatrix();
  signedOut[3].authenticatedAdmin = false;
  assert.throws(
    () => assertPodcastAdminTabMatrixContract(signedOut),
    /requires an authenticated session/
  );
  const overwhelming = validTabMatrix();
  overwhelming[4].activeGroups = ["sponsors", "billing"];
  assert.throws(
    () => assertPodcastAdminTabMatrixContract(overwhelming),
    /progressively disclose only their primary operating group/
  );
});

test("rejects inherited one-sided admin list margins", () => {
  const observed = validObservation();
  observed.listItemMarginViolations = [{
    classes: [],
    marginStart: 32,
    marginEnd: 0,
    text: "Owner verification Missing"
  }];
  assert.throws(
    () => assertPodcastAdminSpacingContract(observed),
    /one-sided editorial margins/
  );
});

test("fails closed when authenticated list spacing was not measured", () => {
  const observed = validObservation();
  delete observed.listItemMarginViolations;
  assert.throws(
    () => assertPodcastAdminSpacingContract(observed),
    /could not inspect list-item inline spacing/
  );
});

test("accepts a fully certified directory set with every card closed", () => {
  const observed = validObservation();
  observed.distribution.actionableDirectoryCount = 0;
  observed.distribution.openDirectoryCount = 0;
  assert.doesNotThrow(() => assertPodcastAdminTraceContract(
    observed,
    { adminTab: "distribution" }
  ));
});

test("ignores Distribution-only checks for other admin views", () => {
  assert.doesNotThrow(() => assertPodcastAdminTraceContract(
    {},
    { adminTab: "episodes" }
  ));
});

test("rejects signed-out shells when Distribution was requested", () => {
  assert.throws(() => assertPodcastAdminTraceContract(
    { authenticatedAdmin: false },
    { adminTab: "distribution" }
  ), /requires an authenticated Podcast admin session/);
});

for (const [name, mutate, message] of [
  [
    "missing guidance",
    (observed) => { observed.distribution.guidancePresent = false; },
    /progressive operating guidance/
  ],
  [
    "expanded guidance",
    (observed) => { observed.distribution.guidanceOpen = true; },
    /collapsed by default/
  ],
  [
    "incomplete launch directory set",
    (observed) => { observed.distribution.directoryCount = 9; },
    /fewer than 10 launch directories/
  ],
  [
    "multiple open directories",
    (observed) => { observed.distribution.openDirectoryCount = 2; },
    /only the first actionable directory/
  ],
  [
    "missing actionable state",
    (observed) => { delete observed.distribution.actionableDirectoryCount; },
    /could not determine actionable directories/
  ],
  [
    "missing compact proof summaries",
    (observed) => { observed.distribution.summaryCount = 10; },
    /compact proof progress/
  ],
  [
    "one-sided certification row inset",
    (observed) => {
      observed.distribution.certificationRowInset = { start: 32, end: 0 };
    },
    /share the expanded card's horizontal inset/
  ]
]) {
  test(`fails closed for ${name}`, () => {
    const observed = validObservation();
    mutate(observed);
    assert.throws(
      () => assertPodcastAdminTraceContract(
        observed,
        { adminTab: "distribution" }
      ),
      message
    );
  });
}
