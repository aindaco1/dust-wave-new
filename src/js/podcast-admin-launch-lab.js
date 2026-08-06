const PROVIDERS = [
  "resend",
  "stripe",
  "youtube",
  "rss",
  "directory",
  "ads",
  "pool"
];
const STATES = ["passed", "pending", "running", "failed"];

export function mountPodcastLaunchLab({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  navigate = (url) => globalThis.location?.assign(url)
}) {
  const panel = root.querySelector("[data-podcast-launch-lab]");
  const state = root.querySelector("[data-podcast-launch-lab-state]");
  const metrics = root.querySelector("[data-podcast-launch-lab-metrics]");
  const evidence = root.querySelector("[data-podcast-launch-lab-evidence]");
  const providers = root.querySelector("[data-podcast-launch-lab-providers]");
  const status = root.querySelector("[data-podcast-launch-lab-status]");
  const refresh = root.querySelector("[data-podcast-launch-lab-refresh]");
  const checkout = root.querySelector("[data-podcast-launch-lab-checkout]");
  let authorized = false;
  let requestId = 0;

  refresh?.addEventListener("click", () => void load());
  checkout?.addEventListener("click", () => void openCheckout());

  return { setAuthorized, load, reset };

  function setAuthorized(value) {
    authorized = value === true;
    reset();
    return authorized ? load() : Promise.resolve();
  }

  function reset() {
    requestId += 1;
    if (panel) panel.hidden = true;
    if (evidence) evidence.hidden = true;
    metrics?.replaceChildren();
    providers?.replaceChildren();
    if (refresh) refresh.disabled = false;
    if (checkout) checkout.disabled = false;
    setStatus(status, "");
  }

  async function openCheckout() {
    if (!authorized || !checkout) return;
    checkout.disabled = true;
    setStatus(status, text("launchLabCheckoutOpening"));
    try {
      const payload = await client.request(
        "/v1/admin/launch-lab/stripe-checkout",
        { method: "POST" }
      );
      const destination = validateLaunchLabCheckoutUrl(payload?.checkout?.url);
      if (!destination) {
        throw new Error(text("launchLabCheckoutInvalid"));
      }
      navigate(destination);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      checkout.disabled = false;
    }
  }

  async function load() {
    if (!authorized || !panel) return;
    const currentRequest = ++requestId;
    if (refresh) refresh.disabled = true;
    setStatus(status, text("launchLabLoading"));
    try {
      const payload = await client.request("/v1/admin/launch-lab");
      if (currentRequest !== requestId || !authorized) return;
      panel.hidden = false;
      renderLaunchLab({ state, metrics, evidence, providers }, payload, text);
      const view = summarizeLaunchLab(payload);
      setStatus(
        status,
        view.runAvailable
          ? text("launchLabReady", {
              state: text(`launchLabState_${view.status}`),
              date: formatLaunchLabDate(view.startedAt)
            })
          : text("launchLabNoRuns")
      );
    } catch (error) {
      if (currentRequest !== requestId) return;
      if ([404, 405].includes(Number(error?.status))) {
        reset();
        return;
      }
      panel.hidden = false;
      setStatus(status, friendlyError(error), true);
    } finally {
      if (currentRequest === requestId && refresh) refresh.disabled = false;
    }
  }
}

export function validateLaunchLabCheckoutUrl(value) {
  try {
    const target = new URL(String(value || ""));
    if (
      target.origin !== "https://checkout.stripe.com"
      || target.username
      || target.password
      || !/^\/c\/pay\/cs_test_[A-Za-z0-9_]+$/u.test(target.pathname)
    ) {
      return "";
    }
    return target.toString();
  } catch {
    return "";
  }
}

export function summarizeLaunchLab(payload) {
  const fixture = payload?.fixture || {};
  const fixtureSafe = fixture.exists === true
    && fixture.testFixture === true
    && fixture.publiclyDiscoverable === false
    && fixture.billable === false
    && fixture.launchGateEligible === false;
  const latest = payload?.latest && typeof payload.latest === "object"
    ? payload.latest
    : null;
  const scenarios = Array.isArray(latest?.scenarios)
    ? latest.scenarios.flatMap(normalizeScenario)
    : [];
  const counts = Object.fromEntries(STATES.map((value) => [value, 0]));
  for (const scenario of scenarios) counts[scenario.state] += 1;
  const providers = PROVIDERS.flatMap((provider) => {
    const providerScenarios = scenarios.filter((scenario) =>
      scenario.provider === provider
    );
    return providerScenarios.length ? [{
      provider,
      scenarios: providerScenarios,
      total: providerScenarios.length,
      passed: providerScenarios.filter(({ state }) => state === "passed").length
    }] : [];
  });
  const declaredStatus = String(latest?.status || "");
  const status = counts.failed > 0
    ? "failed"
    : scenarios.length > 0 && counts.passed === scenarios.length
      ? "passed"
      : STATES.includes(declaredStatus)
        ? declaredStatus
        : "running";
  return {
    fixtureSafe,
    runAvailable: Boolean(latest && scenarios.length),
    status,
    startedAt: validDate(latest?.startedAt),
    sourceCommit: /^[a-f0-9]{40}$/u.test(String(latest?.sourceCommit || ""))
      ? String(latest.sourceCommit).slice(0, 12)
      : "",
    counts,
    total: scenarios.length,
    providers
  };
}

export function renderLaunchLab(nodes, payload, text) {
  const view = summarizeLaunchLab(payload);
  if (nodes.state) {
    nodes.state.textContent = view.fixtureSafe
      ? text("launchLabFixtureSafe")
      : text("launchLabFixtureUnsafe");
    nodes.state.dataset.state = !view.fixtureSafe || view.status === "failed"
      ? "failed"
      : view.status === "passed" ? "ready" : "running";
  }
  nodes.metrics?.replaceChildren(...STATES.map((metric) => {
    const wrapper = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");
    label.textContent = text(`launchLabMetric_${metric}`);
    value.textContent = String(view.counts[metric]);
    wrapper.append(label, value);
    return wrapper;
  }));
  nodes.providers?.replaceChildren(...view.providers.map((provider) => {
    const group = document.createElement("details");
    group.className = "podcast-admin__advanced-tools";
    const summary = document.createElement("summary");
    summary.textContent = text("launchLabProviderSummary", {
      provider: text(`launchLabProvider_${provider.provider}`),
      passed: provider.passed,
      total: provider.total
    });
    const list = document.createElement("ul");
    list.className = "podcast-admin__rss-import-checks";
    list.append(...provider.scenarios.map((scenario) => {
      const item = document.createElement("li");
      item.className = scenario.state === "passed" ? "is-ready" : "is-pending";
      const label = document.createElement("span");
      const result = document.createElement("strong");
      label.textContent = text(
        `launchLabScenario_${scenario.provider}_${scenario.scenario}`,
        humanizeScenario(scenario.scenario)
      );
      result.textContent = text(`launchLabState_${scenario.state}`);
      item.append(label, result);
      return item;
    }));
    group.append(summary, list);
    return group;
  }));
  if (nodes.evidence) nodes.evidence.hidden = view.providers.length === 0;
}

function normalizeScenario(value) {
  if (!value || typeof value !== "object") return [];
  const provider = String(value.provider || "");
  const scenario = String(value.scenario || "");
  const state = String(value.state || "");
  return PROVIDERS.includes(provider)
    && /^[a-z0-9_]{1,80}$/u.test(scenario)
    && STATES.includes(state)
    ? [{ provider, scenario, state }]
    : [];
}

function validDate(value) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLaunchLabDate(value) {
  if (!(value instanceof Date)) return "—";
  return new Intl.DateTimeFormat(document.documentElement.lang || "en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function humanizeScenario(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
