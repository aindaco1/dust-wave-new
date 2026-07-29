import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveEpisodeWorkflow,
  workflowStepForNode
} from "../src/js/podcast-admin-publish-workflow-core.js";

test("episode workflow derives steps from immutable readiness evidence", () => {
  const derived = deriveEpisodeWorkflow({
    id: "episode_1",
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "pending",
    status: "draft"
  }, {
    candidateGate: { ready: false },
    nodes: [
      {
        id: "core_metadata",
        severity: "blocker",
        status: "ready"
      },
      {
        id: "core.delivery_audio",
        severity: "blocker",
        status: "missing"
      }
    ]
  });

  assert.equal(derived.nextStep, "media");
  assert.equal(derived.blockers.length, 1);
  assert.equal(
    derived.steps.find(({ id }) => id === "media").status,
    "needs_action"
  );
  assert.equal(workflowStepForNode(derived.blockers[0]), "media");
});

test("episode evidence completes details and media without duplicate nodes", () => {
  const derived = deriveEpisodeWorkflow({
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "ready",
    status: "draft"
  }, {
    candidateGate: { ready: false, blockerCount: 1 },
    nodes: []
  });

  assert.equal(
    derived.steps.find(({ id }) => id === "details").status,
    "complete"
  );
  assert.equal(
    derived.steps.find(({ id }) => id === "media").status,
    "complete"
  );
  assert.equal(derived.nextStep, "review");
});
