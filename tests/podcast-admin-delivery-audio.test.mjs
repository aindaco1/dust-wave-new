import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeliveryAudioApprovalRequest
} from "../src/js/podcast-admin-delivery-audio-approval.js";
import {
  mountDeliveryAudio
} from "../src/js/podcast-admin-delivery-audio.js";

const READY_JOB = Object.freeze({
  id: "delivery_audio_fixture",
  episodeId: "episode_fixture",
  sourceMasterId: "master_fixture",
  status: "ready",
  current: true,
  streamProfile: "podcast-v1",
  output: { bytes: 2_048, sha256: "a".repeat(64) },
  peaks: { length: 100, sha256: "b".repeat(64) },
  processor: { reportSha256: "c".repeat(64) },
  approval: { eligible: true, approvedCurrent: false }
});

test("builds an exact, normalized delivery-audio approval request", () => {
  assert.deepEqual(buildDeliveryAudioApprovalRequest({
    job: READY_JOB,
    selectedEpisodeId: " episode_fixture ",
    currentMasterId: "master_fixture",
    approvalReason: "  Ｆull   episode render approved.  ",
    acknowledged: true
  }), {
    path: "/v1/admin/delivery-audio-jobs/delivery_audio_fixture/approve",
    options: {
      method: "POST",
      body: {
        workingMasterId: "master_fixture",
        approvalReason: "Full episode render approved."
      }
    }
  });
});

test("fails closed when delivery approval evidence is stale or unsafe", () => {
  const input = {
    job: READY_JOB,
    selectedEpisodeId: "episode_fixture",
    currentMasterId: "master_fixture",
    approvalReason: "Full render approved.",
    acknowledged: true
  };
  const rejected = [
    { acknowledged: false },
    { approvalReason: "too short" },
    { approvalReason: "approved\nwithout review" },
    { selectedEpisodeId: "other_episode" },
    { currentMasterId: "other_master" },
    { job: { ...READY_JOB, current: false } },
    { job: { ...READY_JOB, status: "approved" } },
    { job: { ...READY_JOB, id: "unsafe/job" } },
    { job: { ...READY_JOB, approval: { eligible: false } } }
  ];
  for (const override of rejected) {
    assert.equal(
      buildDeliveryAudioApprovalRequest({ ...input, ...override }),
      null
    );
  }
});

test("requires the exact confirmation before posting approval", async () => {
  const fixture = deliveryFixture({ jobs: [READY_JOB] });
  try {
    await fixture.controller.refresh();
    const form = findTag(fixture.results, "form");
    assert.ok(form);
    form.elements.approvalReason.value = "Full render approved.";

    await form.dispatch("submit");
    assert.deepEqual(fixture.approvalPosts, []);

    form.elements.acknowledgeExactDeliveryAudio.checked = true;
    await form.dispatch("submit");
    assert.deepEqual(fixture.approvalPosts, [{
      path: "/v1/admin/delivery-audio-jobs/delivery_audio_fixture/approve",
      body: {
        workingMasterId: "master_fixture",
        approvalReason: "Full render approved."
      }
    }]);
    assert.deepEqual(fixture.approvedEpisodes, ["episode_fixture"]);
    assert.equal(fixture.status.textContent, "deliveryAudioApproved");
    assert.equal(form.querySelector('button[type="submit"]').disabled, true);
  } finally {
    fixture.restore();
  }
});

test("does not misreport a committed approval when follow-up refresh fails", async () => {
  const fixture = deliveryFixture({
    jobs: [READY_JOB],
    failApprovedRefresh: true
  });
  try {
    await fixture.controller.refresh();
    const form = findTag(fixture.results, "form");
    form.elements.approvalReason.value = "Full render approved.";
    form.elements.acknowledgeExactDeliveryAudio.checked = true;
    await form.dispatch("submit");

    const formStatus = form.children.at(-1);
    assert.equal(fixture.approvalPosts.length, 1);
    assert.equal(fixture.status.textContent, "deliveryAudioApproved");
    assert.equal(
      formStatus.textContent,
      "deliveryAudioApprovalRefreshFailed"
    );
    assert.equal(formStatus.error, true);
    assert.equal(form.querySelector('button[type="submit"]').disabled, true);
  } finally {
    fixture.restore();
  }
});

test("restores approval controls when the mutation itself fails", async () => {
  const fixture = deliveryFixture({ jobs: [READY_JOB], failApproval: true });
  try {
    await fixture.controller.refresh();
    const form = findTag(fixture.results, "form");
    form.elements.approvalReason.value = "Full render approved.";
    form.elements.acknowledgeExactDeliveryAudio.checked = true;
    await form.dispatch("submit");

    const formStatus = form.children.at(-1);
    assert.equal(formStatus.textContent, "friendly:approval_failed");
    assert.equal(formStatus.error, true);
    assert.equal(form.querySelector('button[type="submit"]').disabled, false);
    assert.equal(fixture.status.textContent, "");
  } finally {
    fixture.restore();
  }
});

test("retries an ambiguous delivery queue with the same operation ID", async () => {
  const fixture = deliveryFixture({ failFirstQueue: true });
  try {
    await fixture.controller.refresh();
    assert.equal(fixture.queueButton.disabled, false);

    await fixture.queueButton.dispatch("click");
    assert.equal(fixture.queueButton.disabled, false);
    await fixture.queueButton.dispatch("click");

    assert.deepEqual(fixture.queuePosts.map(({ body }) => body.jobId), [
      "delivery_audio_fixture_1",
      "delivery_audio_fixture_1"
    ]);
    assert.equal(fixture.operationCount(), 1);
    assert.equal(fixture.queueButton.disabled, true);
  } finally {
    fixture.restore();
  }
});

function deliveryFixture({
  jobs = [],
  failFirstQueue = false,
  failApproval = false,
  failApprovedRefresh = false
} = {}) {
  const originalDocument = globalThis.document;
  const originalOption = globalThis.Option;
  const originalWindow = globalThis.window;
  const select = element({ value: "episode_fixture" });
  const refreshButton = element({ tagName: "button" });
  const queueButton = element({ tagName: "button", disabled: true });
  const summary = element();
  const results = element();
  const status = element();
  const selectors = new Map([
    ["[data-podcast-delivery-audio-episode]", select],
    ["[data-podcast-delivery-audio-refresh]", refreshButton],
    ["[data-podcast-delivery-audio-queue]", queueButton],
    ["[data-podcast-delivery-audio-summary]", summary],
    ["[data-podcast-delivery-audio-results]", results],
    ["[data-podcast-delivery-audio-status]", status],
    ["#podcast-panel-production", null],
    ["#podcast-panel-episodes", null]
  ]);
  globalThis.document = {
    documentElement: { lang: "en" },
    createElement: (tagName) => element({ tagName }),
    createTextNode: (textContent) => ({ textContent: String(textContent) })
  };
  globalThis.Option = class {
    constructor(text, value, _defaultSelected, selected) {
      this.text = text;
      this.value = value;
      this.selected = selected;
    }
  };
  globalThis.window = { DWDigestAudio: { mount() {} } };
  let currentJobs = jobs;
  let queueAttempts = 0;
  let operationSequence = 0;
  const queuePosts = [];
  const approvalPosts = [];
  const approvedEpisodes = [];
  const client = {
    async request(path, options) {
      if (path.endsWith("/approve")) {
        approvalPosts.push({ path, body: options.body });
        if (failApproval) throw new Error("approval_failed");
        return { job: { ...READY_JOB, status: "approved" } };
      }
      if (options?.method === "POST") {
        queuePosts.push({ path, body: options.body });
        queueAttempts += 1;
        if (failFirstQueue && queueAttempts === 1) {
          throw new Error("response_lost");
        }
        currentJobs = [{
          id: options.body.jobId,
          episodeId: "episode_fixture",
          sourceMasterId: "master_fixture",
          status: "queued",
          current: true,
          approval: { eligible: false, approvedCurrent: false }
        }];
        return {
          job: { id: options.body.jobId },
          processor: { workflow: "process-delivery-audio.yml" }
        };
      }
      if (path.endsWith("/audio-master")) {
        return { current: { id: "master_fixture", revision: 3 } };
      }
      if (path.endsWith("/delivery-audio-jobs")) {
        return {
          processor: { available: true },
          safeguards: { normalizedStreamProfile: "podcast-v1" },
          jobs: currentJobs
        };
      }
      throw new Error(`Unexpected request: ${path}`);
    }
  };
  const controller = mountDeliveryAudio({
    root: { querySelector: (selector) => selectors.get(selector) ?? null },
    client,
    text(key) { return key; },
    setStatus(node, message, error = false) {
      node.textContent = message;
      node.error = error;
    },
    friendlyError: (error) => `friendly:${error.message}`,
    operationId(prefix) {
      operationSequence += 1;
      return `${prefix}_fixture_${operationSequence}`;
    },
    buildPlayer: () => element(),
    localizeCode: (_group, value) => value,
    canQueue: () => true,
    canApprove: () => true,
    async onApproved(episodeId) {
      approvedEpisodes.push(episodeId);
      if (failApprovedRefresh) throw new Error("refresh_failed");
    }
  });
  return {
    approvalPosts,
    approvedEpisodes,
    controller,
    operationCount: () => operationSequence,
    queueButton,
    queuePosts,
    results,
    status,
    restore() {
      globalThis.document = originalDocument;
      globalThis.Option = originalOption;
      globalThis.window = originalWindow;
    }
  };
}

function element(values = {}) {
  const listeners = new Map();
  return {
    tagName: "div",
    value: "",
    checked: false,
    disabled: false,
    required: false,
    minLength: 0,
    maxLength: -1,
    textContent: "",
    className: "",
    children: [],
    ...values,
    get elements() {
      const controls = Object.create(null);
      walk(this, (node) => {
        if (node.name) controls[node.name] = node;
      });
      return controls;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatch(type) {
      return listeners.get(type)?.({ preventDefault() {} });
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    querySelector(selector) {
      if (selector !== 'button[type="submit"]') return null;
      return find(this, (node) =>
        node.tagName === "button" && node.type === "submit"
      );
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return null;
    },
    reportValidity() {
      let valid = true;
      walk(this, (node) => {
        if (!node.required) return;
        if (node.type === "checkbox") {
          valid &&= node.checked === true;
          return;
        }
        const value = String(node.value || "");
        valid &&= Boolean(value)
          && value.length >= Number(node.minLength || 0)
          && (node.maxLength < 0 || value.length <= node.maxLength);
      });
      return valid;
    },
    setAttribute(name, value) {
      this[name] = String(value);
    }
  };
}

function walk(root, callback) {
  for (const child of root?.children || []) {
    if (!child || typeof child !== "object") continue;
    callback(child);
    walk(child, callback);
  }
}

function find(root, predicate) {
  let result = null;
  walk(root, (node) => {
    if (!result && predicate(node)) result = node;
  });
  return result;
}

function findTag(root, tagName) {
  return find(root, (node) => node.tagName === tagName);
}
