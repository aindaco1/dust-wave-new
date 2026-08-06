import assert from "node:assert/strict";
import test from "node:test";
import {
  createDistributionDisclosureState,
  distributionEvidenceProgress,
  distributionEvidenceSummary,
  distributionSetupLinkLabelKey
} from "../src/js/podcast-admin-distribution-disclosure.js";

const destinations = [
  {
    id: "disabled",
    enabled: false,
    certification: { certified: false }
  },
  {
    id: "first-actionable",
    enabled: true,
    certification: { certified: false }
  },
  {
    id: "second-actionable",
    enabled: true,
    certification: { certified: false }
  }
];

test("opens only the first actionable directory on initial render", () => {
  const state = createDistributionDisclosureState();
  assert.deepEqual(
    [...state.prepare("show-1", destinations)],
    ["first-actionable"]
  );
});

test("preserves operator disclosure choices across refreshes per show", () => {
  const state = createDistributionDisclosureState();
  state.prepare("show-1", destinations);
  state.set("show-1", "first-actionable", false);
  state.set("show-1", "second-actionable", true);

  assert.deepEqual(
    [...state.prepare("show-1", destinations)],
    ["second-actionable"]
  );
  assert.deepEqual(
    [...state.prepare("show-2", destinations)],
    ["first-actionable"]
  );
});

test("does not reopen a directory after the operator closes every card", () => {
  const state = createDistributionDisclosureState();
  state.prepare("show-1", destinations);
  state.set("show-1", "first-actionable", false);
  assert.deepEqual([...state.prepare("show-1", destinations)], []);
});

test("keeps all cards closed when no enabled directory needs action", () => {
  const state = createDistributionDisclosureState();
  assert.deepEqual([...state.prepare("show-ready", [
    {
      id: "ready",
      enabled: true,
      certification: { certified: true }
    },
    {
      id: "disabled",
      enabled: false,
      certification: { certified: false }
    }
  ])], []);
});

test("mount wires native disclosure toggles back into show state", () => {
  const state = createDistributionDisclosureState();
  const context = state.context("show-1", destinations);
  const listeners = new Map();
  const card = {
    dataset: {},
    open: false,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  };

  state.mount(card, context, "first-actionable");
  assert.equal(card.dataset.destinationId, "first-actionable");
  assert.equal(card.open, true);

  card.open = false;
  listeners.get("toggle")();
  assert.deepEqual(
    [...state.context("show-1", destinations).openDestinationIds],
    []
  );
});

test("reports the compact four-part certification progress", () => {
  assert.deepEqual(distributionEvidenceProgress({
    ownerVerified: true,
    feedValidated: true,
    ingestionObserved: false,
    failureRecoveryVerified: false
  }), { ready: 2, total: 4 });
});

test("combines provider semantics with localized proof progress", () => {
  const text = (key, values) => key === "rssFollowingDirectory"
    ? "RSS directory"
    : `${values.ready}/${values.total} proofs`;
  assert.equal(
    distributionEvidenceSummary({
      mode: "rss",
      certification: { ownerVerified: true }
    }, text),
    "RSS directory · 1/4 proofs"
  );
});

test("labels no-setup provider links as information instead of owner setup", () => {
  assert.equal(
    distributionSetupLinkLabelKey({ ownerSetupStatus: "not_required" }),
    "openProviderInfo"
  );
  assert.equal(
    distributionSetupLinkLabelKey({ ownerSetupStatus: "verified" }),
    "openOwnerSetup"
  );
  assert.equal(distributionSetupLinkLabelKey(), "openOwnerSetup");
});
