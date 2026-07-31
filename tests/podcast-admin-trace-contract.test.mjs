import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPodcastAdminTraceContract,
  podcastAdminTraceContractSummary
} from "../scripts/lib/podcast-admin-trace-contract.mjs";

function validObservation() {
  return {
    authenticatedAdmin: true,
    distribution: {
      guidancePresent: true,
      guidanceOpen: false,
      directoryCount: 11,
      actionableDirectoryCount: 1,
      openDirectoryCount: 1,
      summaryCount: 11
    }
  };
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
