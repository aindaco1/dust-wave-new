import assert from "node:assert/strict";
import test from "node:test";
import {
  createEpisodePublisher
} from "../src/js/podcast-admin-publication.js";
import {
  normalizePublicationOverrideReason
} from "../src/js/podcast-admin-publication-security.js";

const DIGEST = "e".repeat(64);

class FixtureApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function text(key, values) {
  return values === undefined
    ? key
    : `${key}:${JSON.stringify(values)}`;
}

function fixture({
  readiness,
  publicationResult = {
    idempotent: false,
    publicationRevision: 3,
    status: "scheduled",
    distributionTargets: 12,
    publicationGate: { mode: "shadow", snapshotMatched: true }
  },
  dialogResults = [{ confirmed: true, value: "" }],
  publicationError = null
}) {
  const requests = [];
  const dialogs = [];
  const reports = [];
  const readinessEvents = [];
  const publishedEvents = [];
  const client = {
    async request(path, options) {
      requests.push({ path, options });
      if (!options) return readiness;
      if (publicationError) throw publicationError;
      return publicationResult;
    }
  };
  const publisher = createEpisodePublisher({
    client,
    ApiError: FixtureApiError,
    confirmationDialog: {
      async open(configuration) {
        dialogs.push(configuration);
        return dialogResults.shift() || { confirmed: false, value: "" };
      }
    },
    text,
    nodeLabel: (node) => `node:${node.id}`,
    operationId: (prefix) => `${prefix}_fixture`,
    report(message, error = false) {
      reports.push({ message, error });
    },
    friendlyError: (error) => `error:${error.code || error.message}`,
    humanizeCode: (value) => `human:${value}`,
    onReadiness: async (...values) => readinessEvents.push(values),
    onPublished: async (...values) => publishedEvents.push(values)
  });
  return {
    dialogs,
    publisher,
    publishedEvents,
    readinessEvents,
    reports,
    requests
  };
}

test("publishes the exact refreshed shadow snapshot after confirmation", async () => {
  const readiness = {
    publicationGateMode: "shadow",
    publicationRevision: 2,
    snapshotDigest: DIGEST,
    candidateGate: { ready: true },
    nodes: []
  };
  const state = fixture({ readiness });
  const button = { disabled: false };

  await state.publisher("episode / one", button);

  assert.equal(button.disabled, false);
  assert.deepEqual(state.requests, [
    {
      path: "/v1/admin/episodes/episode%20%2F%20one/readiness",
      options: undefined
    },
    {
      path: "/v1/admin/episodes/episode%20%2F%20one/publish",
      options: {
        method: "POST",
        body: {
          snapshotDigest: DIGEST,
          basePublicationRevision: 2
        }
      }
    }
  ]);
  assert.deepEqual(state.readinessEvents, [["episode / one", readiness]]);
  assert.equal(state.publishedEvents.length, 1);
  assert.deepEqual(state.dialogs[0].items, [
    "publishDestinationNews",
    "publishDestinationRss",
    "publishDestinationYoutube"
  ]);
  assert.deepEqual(state.reports.at(-1), {
    message: "revisionStatus:{\"revision\":3,\"status\":\"human:scheduled\"} "
      + "directoryStatesCreated:{\"count\":12} shadowSnapshotMatched",
    error: false
  });
});

test("publishes an authorized blocker override with a normalized reason", async () => {
  const readiness = {
    publicationGateMode: "enforce",
    publicationRevision: 4,
    snapshotDigest: DIGEST,
    candidateGate: { ready: false, overrideAvailable: true },
    nodes: [
      { id: "missing", severity: "blocker", status: "missing" },
      { id: "ready", severity: "blocker", status: "ready" },
      { id: "warning", severity: "warning", status: "missing" }
    ]
  };
  const state = fixture({
    readiness,
    dialogResults: [{
      confirmed: true,
      value: "  Reviewed   with the producer.  "
    }]
  });

  await state.publisher("episode_fixture", { disabled: false });

  assert.equal(state.dialogs.length, 1);
  assert.deepEqual(state.dialogs[0].items, ["node:missing"]);
  assert.deepEqual(state.requests[1].options.body, {
    snapshotDigest: DIGEST,
    basePublicationRevision: 4,
    override: {
      id: "publication_override_fixture",
      reason: "Reviewed with the producer.",
      confirmation: "PUBLISH_WITH_BLOCKERS"
    }
  });
});

test("rejects unsafe override text before publication", async () => {
  const state = fixture({
    readiness: {
      publicationGateMode: "enforce",
      publicationRevision: 1,
      snapshotDigest: DIGEST,
      candidateGate: { ready: false, overrideAvailable: true },
      nodes: [{ id: "missing", severity: "blocker", status: "missing" }]
    },
    dialogResults: [{ confirmed: true, value: "Approved \u202etext" }]
  });
  const button = { disabled: false };

  await state.publisher("episode_fixture", button);

  assert.equal(button.disabled, false);
  assert.equal(state.requests.length, 1);
  assert.deepEqual(state.reports.at(-1), {
    message: "error:publication_override_reason_invalid",
    error: true
  });
  assert.equal(normalizePublicationOverrideReason("line one\nline two"), null);
  assert.equal(normalizePublicationOverrideReason("\u0000hidden"), null);
  assert.equal(
    normalizePublicationOverrideReason("  Ａpproved   safely.  "),
    "Approved safely."
  );
  assert.equal(normalizePublicationOverrideReason("x".repeat(501)), null);
});

test("fails closed when blockers cannot be overridden", async () => {
  const state = fixture({
    readiness: {
      publicationGateMode: "enforce",
      candidateGate: { ready: false, overrideAvailable: false },
      nodes: [{ id: "missing", severity: "blocker", status: "missing" }]
    }
  });

  await state.publisher("episode_fixture", { disabled: false });

  assert.equal(state.dialogs.length, 0);
  assert.equal(state.requests.length, 1);
  assert.deepEqual(state.reports.at(-1), {
    message: "error:publication_not_ready",
    error: true
  });
});

test("reports an idempotent publication without inventing new release state", async () => {
  const state = fixture({
    readiness: {
      publicationGateMode: "shadow",
      publicationRevision: 7,
      snapshotDigest: DIGEST,
      candidateGate: { ready: true },
      nodes: []
    },
    publicationResult: {
      idempotent: true,
      publicationRevision: 7,
      status: "published",
      distributionTargets: 12,
      publicationGate: { mode: "shadow", bypassed: "idempotent" }
    }
  });

  await state.publisher("episode_fixture", { disabled: false });

  assert.equal(state.requests.length, 2);
  assert.deepEqual(state.reports.at(-1), {
    message: "alreadyPublishedRevision:{\"revision\":7}",
    error: false
  });
  assert.equal(state.publishedEvents.length, 1);
});

test("cancellation and request failures never leave publication disabled", async () => {
  const readiness = {
    publicationGateMode: "shadow",
    publicationRevision: 2,
    snapshotDigest: DIGEST,
    candidateGate: { ready: true },
    nodes: []
  };
  const canceled = fixture({
    readiness,
    dialogResults: [{ confirmed: false, value: "" }]
  });
  const canceledButton = { disabled: false };
  await canceled.publisher("episode_fixture", canceledButton);
  assert.equal(canceledButton.disabled, false);
  assert.equal(canceled.requests.length, 1);
  assert.deepEqual(canceled.reports.at(-1), {
    message: "publicationCanceled",
    error: false
  });

  const failed = fixture({
    readiness,
    publicationError: Object.assign(new Error("conflict"), {
      code: "publication_snapshot_stale"
    })
  });
  const failedButton = { disabled: false };
  await failed.publisher("episode_fixture", failedButton);
  assert.equal(failedButton.disabled, false);
  assert.equal(failed.requests.length, 2);
  assert.deepEqual(failed.reports.at(-1), {
    message: "error:publication_snapshot_stale",
    error: true
  });
});
