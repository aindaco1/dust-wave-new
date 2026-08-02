import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const {
  mountPodcastLaunchLab,
  renderLaunchLab,
  summarizeLaunchLab
} = await import("../src/js/podcast-admin-launch-lab.js");

test("derives all counts from allowlisted content-free scenarios", () => {
  const view = summarizeLaunchLab(rehearsalPayload());

  assert.equal(view.fixtureSafe, true);
  assert.equal(view.runAvailable, true);
  assert.equal(view.status, "running");
  assert.deepEqual(view.counts, {
    passed: 2,
    pending: 1,
    running: 1,
    failed: 0
  });
  assert.equal(view.total, 4);
  assert.equal(view.sourceCommit, "aaaaaaaaaaaa");
  assert.deepEqual(view.providers.map(({ provider, total, passed }) => ({
    provider,
    total,
    passed
  })), [{ provider: "resend", total: 2, passed: 1 }, {
    provider: "stripe", total: 1, passed: 1
  }, { provider: "youtube", total: 1, passed: 0 }]);
});

test("ignores unknown providers and invalid scenario or state values", () => {
  const payload = rehearsalPayload();
  payload.latest.scenarios.push(
    { provider: "listener_email", scenario: "address", state: "passed" },
    { provider: "resend", scenario: "recipient@example.com", state: "passed" },
    { provider: "stripe", scenario: "refund", state: "provider_payload" }
  );

  const view = summarizeLaunchLab(payload);
  assert.equal(view.total, 4);
  assert.equal(JSON.stringify(view).includes("recipient@example.com"), false);
});

test("renders compact metrics and collapsed provider evidence", () => {
  const previousDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const nodes = launchLabNodes();
    renderLaunchLab(nodes, rehearsalPayload(), translate);

    assert.equal(nodes.state.textContent, "Fixture isolated");
    assert.equal(nodes.state.dataset.state, "running");
    assert.equal(nodes.metrics.children.length, 4);
    assert.equal(nodes.metrics.children[0].children[1].textContent, "2");
    assert.equal(nodes.evidence.hidden, false);
    assert.equal(nodes.providers.children.length, 3);
    assert.match(
      nodes.providers.children[0].children[0].textContent,
      /Resend · 1 of 2 passed/u
    );
  } finally {
    globalThis.document = previousDocument;
  }
});

test("mount hides unavailable environments and restores refresh state", async () => {
  const nodes = launchLabNodes();
  const root = fakeRoot(nodes);
  const controller = mountPodcastLaunchLab({
    root,
    client: {
      async request() {
        throw Object.assign(new Error("not found"), { status: 404 });
      }
    },
    text: translate,
    setStatus(node, message) { if (node) node.textContent = message; },
    friendlyError: (error) => error.message
  });

  await controller.setAuthorized(true);

  assert.equal(nodes.panel.hidden, true);
  assert.equal(nodes.refresh.disabled, false);
  assert.equal(nodes.status.textContent, "");
});

test("English and Spanish define the same Launch Lab copy surface", async () => {
  const [english, spanish] = await Promise.all([
    readJson("../src/_data/i18n/en.json"),
    readJson("../src/_data/i18n/es.json")
  ]);
  const englishStatic = launchLabKeys(english.podcast.admin.workbench.overview);
  const spanishStatic = launchLabKeys(spanish.podcast.admin.workbench.overview);
  const englishRuntime = launchLabKeys(english.runtime.admin);
  const spanishRuntime = launchLabKeys(spanish.runtime.admin);

  assert.deepEqual(spanishStatic, englishStatic);
  assert.deepEqual(spanishRuntime, englishRuntime);
  assert.equal(englishRuntime.length, 62);
});

function rehearsalPayload() {
  return {
    fixture: {
      exists: true,
      testFixture: true,
      publiclyDiscoverable: false,
      billable: false,
      launchGateEligible: false
    },
    latest: {
      status: "running",
      sourceCommit: "a".repeat(40),
      startedAt: "2026-08-02T06:00:00.000Z",
      scenarios: [
        { provider: "resend", scenario: "delivered", state: "passed" },
        { provider: "resend", scenario: "suppressed", state: "running" },
        { provider: "stripe", scenario: "api_test_mode", state: "passed" },
        { provider: "youtube", scenario: "channel_identity", state: "pending" }
      ]
    }
  };
}

function translate(key, fallbackOrVariables = {}) {
  const fallback = typeof fallbackOrVariables === "string"
    ? fallbackOrVariables
    : key;
  const variables = typeof fallbackOrVariables === "object"
    ? fallbackOrVariables
    : {};
  const copy = {
    launchLabFixtureSafe: "Fixture isolated",
    launchLabProvider_resend: "Resend",
    launchLabProvider_stripe: "Stripe",
    launchLabProvider_youtube: "YouTube",
    launchLabProviderSummary: "%{provider} · %{passed} of %{total} passed"
  }[key] || fallback;
  return Object.entries(variables).reduce(
    (value, [name, replacement]) =>
      value.replaceAll(`%{${name}}`, String(replacement)),
    copy
  );
}

function launchLabNodes() {
  return {
    panel: fakeNode("section"),
    state: fakeNode("span"),
    metrics: fakeNode("dl"),
    evidence: fakeNode("details"),
    providers: fakeNode("div"),
    status: fakeNode("p"),
    refresh: fakeNode("button")
  };
}

function fakeRoot(nodes) {
  const selectors = new Map([
    ["[data-podcast-launch-lab]", nodes.panel],
    ["[data-podcast-launch-lab-state]", nodes.state],
    ["[data-podcast-launch-lab-metrics]", nodes.metrics],
    ["[data-podcast-launch-lab-evidence]", nodes.evidence],
    ["[data-podcast-launch-lab-providers]", nodes.providers],
    ["[data-podcast-launch-lab-status]", nodes.status],
    ["[data-podcast-launch-lab-refresh]", nodes.refresh]
  ]);
  return { querySelector: (selector) => selectors.get(selector) || null };
}

function fakeDocument() {
  return {
    documentElement: { lang: "en" },
    createElement: fakeNode
  };
}

function fakeNode(tagName) {
  return {
    tagName,
    children: [],
    className: "",
    dataset: {},
    disabled: false,
    hidden: false,
    textContent: "",
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = [...children]; },
    addEventListener() {}
  };
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
}

function launchLabKeys(value) {
  return Object.keys(value).filter((key) => key.startsWith("launchLab")).sort();
}
