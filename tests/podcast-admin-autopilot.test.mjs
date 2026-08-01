import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveEpisodeAutopilot,
  episodeWorkflowNodeRequiresAction
} from "../src/js/podcast-admin-autopilot-core.js";

test("autopilot separates processing, approvals, providers, and failures", () => {
  const readiness = {
    candidateGate: { ready: false },
    nodes: [
      {
        id: "core.delivery_audio",
        group: "core",
        status: "pending",
        severity: "blocker"
      },
      {
        id: "editorial.production_review",
        group: "editorial",
        status: "pending",
        severity: "blocker"
      },
      {
        id: "distribution.youtube",
        group: "distribution",
        status: "pending",
        severity: "blocker"
      },
      {
        id: "monetization.dynamic_ads",
        group: "monetization",
        status: "failed",
        severity: "blocker"
      }
    ]
  };

  const state = deriveEpisodeAutopilot(readiness);
  assert.equal(state.state, "failed");
  assert.deepEqual(state.runningWork.map(({ id }) => id), [
    "core.delivery_audio"
  ]);
  assert.deepEqual(state.approvalWaits.map(({ id }) => id), [
    "editorial.production_review"
  ]);
  assert.deepEqual(state.providerDelays.map(({ id }) => id), [
    "distribution.youtube"
  ]);
  assert.deepEqual(state.terminalFailures.map(({ id }) => id), [
    "monetization.dynamic_ads"
  ]);
});

test("pending automatic and provider work does not become a fix action", () => {
  assert.equal(episodeWorkflowNodeRequiresAction({
    id: "core.delivery_audio",
    group: "core",
    status: "pending"
  }), false);
  assert.equal(episodeWorkflowNodeRequiresAction({
    id: "distribution.rss",
    group: "distribution",
    status: "pending"
  }), false);
  assert.equal(episodeWorkflowNodeRequiresAction({
    id: "editorial.production_review",
    group: "editorial",
    status: "pending"
  }), true);
});

test("alignment and ad-plan review states are approvals, not processing", () => {
  const state = deriveEpisodeAutopilot({
    candidateGate: { ready: false },
    nodes: [
      {
        id: "editorial.word_alignment",
        group: "editorial",
        status: "pending",
        severity: "blocker",
        evidence: { alignmentStatus: "needs_review" }
      },
      {
        id: "monetization.dynamic_ads",
        group: "monetization",
        status: "pending",
        severity: "blocker",
        evidence: { planStatus: "needs_review" }
      }
    ]
  });

  assert.equal(state.state, "awaiting_approval");
  assert.equal(state.approvalWaits.length, 2);
  assert.equal(state.runningWork.length, 0);
});

test("transcript lifecycle evidence separates automation from approval", () => {
  const processing = deriveEpisodeAutopilot({
    candidateGate: { ready: false },
    nodes: [
      {
        id: "editorial.primary_transcript",
        group: "editorial",
        status: "pending",
        severity: "blocker",
        evidence: { transcriptStatus: "processing" }
      },
      {
        id: "editorial.bilingual_transcripts",
        group: "editorial",
        status: "pending",
        severity: "warning",
        evidence: {
          transcriptStatuses: { en: "approved", es: "processing" }
        }
      }
    ]
  });

  assert.equal(processing.state, "processing");
  assert.equal(processing.runningWork.length, 2);
  assert.equal(processing.approvalWaits.length, 0);

  const approval = deriveEpisodeAutopilot({
    candidateGate: { ready: false },
    nodes: [
      {
        id: "editorial.primary_transcript",
        group: "editorial",
        status: "pending",
        severity: "blocker",
        evidence: { transcriptStatus: "needs_review" }
      },
      {
        id: "editorial.bilingual_transcripts",
        group: "editorial",
        status: "pending",
        severity: "warning",
        evidence: {
          transcriptStatuses: { en: "approved", es: "needs_review" }
        }
      }
    ]
  });

  assert.equal(approval.state, "awaiting_approval");
  assert.equal(approval.approvalWaits.length, 2);
  assert.equal(approval.runningWork.length, 0);
});

test("missing transcript lifecycle evidence never invents a human task", () => {
  const state = deriveEpisodeAutopilot({
    candidateGate: { ready: false },
    nodes: [{
      id: "editorial.primary_transcript",
      group: "editorial",
      status: "pending",
      severity: "blocker",
      evidence: {}
    }]
  });

  assert.equal(state.state, "processing");
  assert.equal(state.runningWork.length, 1);
  assert.equal(state.approvalWaits.length, 0);
});

test("ready and loading states remain explicit", () => {
  assert.equal(deriveEpisodeAutopilot(null).state, "checking");
  assert.equal(deriveEpisodeAutopilot({
    candidateGate: { ready: true },
    nodes: [{ status: "ready", severity: "blocker" }]
  }).state, "ready");
});
