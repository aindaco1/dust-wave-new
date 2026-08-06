import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveEpisodeWorkflow,
  workflowStepForNode,
  workflowTargetForNode
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
  assert.equal(derived.nextBlocker.id, "core.delivery_audio");
  assert.equal(
    derived.steps.find(({ id }) => id === "media").status,
    "needs_action"
  );
  assert.equal(workflowStepForNode(derived.blockers[0]), "media");
});

test("readiness nodes route workflow fixes to their exact production tool", () => {
  const routes = [
    ["core.working_master", "media", "working_master"],
    ["core-delivery-audio", "media", "delivery_audio"],
    ["editorial_word_alignment", "transcript", "alignment"],
    ["editorial.chapters", "transcript", "chapters"],
    ["editorial_production_review", "review", "production_review"],
    ["editorial-promotion-clips", "review", "promotion_clips"]
  ];

  for (const [id, step, target] of routes) {
    assert.equal(workflowStepForNode({ id }), step);
    assert.equal(workflowTargetForNode({ id }), target);
  }
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
  assert.equal(derived.nextBlocker, null);
});

test("episode workflow prioritizes one exact blocker in step order", () => {
  const derived = deriveEpisodeWorkflow({
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "pending",
    status: "draft"
  }, {
    candidateGate: { ready: false, blockerCount: 3 },
    nodes: [
      {
        id: "editorial.production_review",
        severity: "blocker",
        status: "missing"
      },
      {
        id: "core.delivery_audio",
        severity: "blocker",
        status: "missing"
      },
      {
        id: "editorial.word_alignment",
        severity: "blocker",
        status: "missing"
      }
    ]
  });

  assert.equal(derived.nextStep, "media");
  assert.equal(derived.nextBlocker.id, "core.delivery_audio");
  assert.equal(derived.nextTarget, "delivery_audio");
  assert.equal(workflowTargetForNode(derived.nextBlocker), "delivery_audio");
  assert.equal(derived.blockers.length, 3);
});

test("episode workflow waits while automatic media work is pending", () => {
  const derived = deriveEpisodeWorkflow({
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "processing",
    status: "draft"
  }, {
    candidateGate: { ready: false, blockerCount: 1 },
    nodes: [{
      id: "core.delivery_audio",
      group: "core",
      severity: "blocker",
      status: "pending"
    }]
  });

  assert.equal(derived.nextStep, "media");
  assert.equal(derived.nextBlocker, null);
  assert.equal(derived.waitingForAutomation, true);
  assert.deepEqual(derived.actionableBlockers, []);
  assert.equal(
    derived.steps.find(({ id }) => id === "media").status,
    "processing"
  );
  assert.equal(
    derived.steps.find(({ id }) => id === "publish").status,
    "processing"
  );
});

test("episode workflow still routes an explicit approval wait", () => {
  const derived = deriveEpisodeWorkflow({
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "ready",
    status: "draft"
  }, {
    candidateGate: { ready: false, blockerCount: 1 },
    nodes: [{
      id: "editorial.production_review",
      group: "editorial",
      severity: "blocker",
      status: "pending"
    }]
  });

  assert.equal(derived.nextStep, "review");
  assert.equal(derived.nextBlocker.id, "editorial.production_review");
  assert.equal(derived.waitingForAutomation, false);
  assert.equal(derived.actionableBlockers.length, 1);
});

test("transcript and alignment warnings remain visible but optional at launch", () => {
  const derived = deriveEpisodeWorkflow({
    title: "Episode",
    summary: "Summary",
    sourceLanguage: "es",
    mediaStatus: "ready",
    status: "draft"
  }, {
    candidateGate: { ready: true, blockerCount: 0, warningCount: 2 },
    nodes: [
      {
        id: "editorial.primary_transcript",
        group: "editorial",
        severity: "warning",
        status: "pending"
      },
      {
        id: "editorial.word_alignment",
        group: "editorial",
        severity: "warning",
        status: "missing"
      }
    ]
  });

  assert.equal(
    derived.steps.find(({ id }) => id === "transcript").status,
    "optional"
  );
  assert.equal(derived.steps.find(({ id }) => id === "publish").status, "ready");
  assert.equal(derived.nextStep, "publish");
  assert.equal(derived.blockers.length, 0);
});
