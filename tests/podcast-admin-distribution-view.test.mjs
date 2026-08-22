import assert from "node:assert/strict";
import test from "node:test";
import {
  distributionDirectoryView,
  distributionReleaseEpisodes,
  orderDistributionDestinations
} from "../src/js/podcast-admin-distribution-view.js";

test("release picker includes only scheduled and published episodes", () => {
  assert.deepEqual(
    distributionReleaseEpisodes([
      { id: "draft", status: "draft" },
      { id: "scheduled", status: "scheduled" },
      { id: "published", status: "published" },
      { id: "archived", status: "archived" }
    ]).map(({ id }) => id),
    ["scheduled", "published"]
  );
});

test("enabled without owner setup becomes one clear needs-setup state", () => {
  assert.deepEqual(
    distributionDirectoryView({
      enabled: true,
      ownerSetupStatus: "not_started",
      certification: { certified: false }
    }),
    { key: "distributionSetupRequired", tone: "is-attention", rank: 1 }
  );
});

test("episode state promotes failures and distinguishes observed listings", () => {
  const destination = {
    enabled: true,
    ownerSetupStatus: "verified",
    certification: { certified: true }
  };
  assert.equal(
    distributionDirectoryView({
      ...destination,
      publicationStatus: "failed"
    }, "episode-1").key,
    "distributionNeedsAttention"
  );
  assert.equal(
    distributionDirectoryView({
      ...destination,
      publicationStatus: "observed"
    }, "episode-1").key,
    "distributionLive"
  );
});

test("directories needing action sort before ready and unused entries", () => {
  const rows = [
    {
      name: "Ready",
      enabled: true,
      ownerSetupStatus: "verified",
      certification: { certified: true }
    },
    {
      name: "Unused",
      enabled: false
    },
    {
      name: "Needs setup",
      enabled: true,
      ownerSetupStatus: "not_started"
    }
  ];
  assert.deepEqual(
    orderDistributionDestinations(rows).map(({ name }) => name),
    ["Needs setup", "Ready", "Unused"]
  );
});
