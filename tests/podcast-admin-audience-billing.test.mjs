import assert from "node:assert/strict";
import test from "node:test";

import {
  mountPodcastAudienceBilling
} from "../src/js/podcast-admin-audience-billing.js";

test("audience and billing remain fail-closed for non-super-admins", async () => {
  const fixture = controllerFixture({ superAdmin: false });
  await fixture.controller.loadSubscribers({ reset: true });
  await fixture.controller.loadBilling();

  assert.equal(fixture.requests.length, 0);
  assert.match(fixture.subscribersRoot.innerHTML, /superAdminOnly/);
  assert.match(fixture.billingRoot.innerHTML, /superAdminOnly/);
  assert.equal(fixture.subscribersExport.disabled, true);
  assert.equal(fixture.billingExport.disabled, true);
  assert.equal(fixture.subscribersMore.hidden, true);
});

test("audience and billing requests retain the selected-show boundary", async () => {
  const fixture = controllerFixture({ superAdmin: true, showId: "show_1" });
  await fixture.controller.loadSubscribers({ reset: true });
  await fixture.controller.loadBilling();

  assert.ok(fixture.requests.some((path) =>
    path.startsWith("/v1/admin/subscribers?")
    && path.includes("showId=show_1")
  ));
  assert.ok(fixture.requests.includes("/v1/admin/billing/readiness"));
  assert.ok(fixture.requests.some((path) =>
    path.startsWith("/v1/admin/billing/tax-evidence?")
    && path.includes("showId=show_1")
  ));
  assert.match(fixture.subscribersRoot.innerHTML, /subscriber-list/);
  assert.match(fixture.billingRoot.innerHTML, /billing-readiness/);
});

test("reset invalidates in-flight state and clears private results", () => {
  const fixture = controllerFixture({ superAdmin: true });
  fixture.subscribersRoot.innerHTML = "private subscribers";
  fixture.billingRoot.innerHTML = "private evidence";
  fixture.controller.reset();
  assert.equal(fixture.subscribersRoot.innerHTML, "");
  assert.equal(fixture.billingRoot.innerHTML, "");
});

function controllerFixture({ superAdmin, showId = "" }) {
  const selectors = new Map();
  const create = (selector) => {
    const value = element();
    selectors.set(selector, value);
    return value;
  };
  const billingRoot = create("[data-podcast-billing]");
  create("[data-podcast-billing-status]");
  create("[data-podcast-billing-refresh]");
  const billingExport = create("[data-podcast-billing-export]");
  const subscribersRoot = create("[data-podcast-subscribers]");
  create("[data-podcast-subscribers-status]");
  const subscribersFilters = create("[data-podcast-subscribers-filters]");
  subscribersFilters.elements = {
    status: { value: "all" },
    provider: { value: "all" }
  };
  create("[data-podcast-subscribers-refresh]");
  const subscribersExport = create("[data-podcast-subscribers-export]");
  const subscribersMore = create("[data-podcast-subscribers-more]");
  const root = { querySelector: (selector) => selectors.get(selector) ?? null };
  const requests = [];
  const client = {
    async request(path) {
      requests.push(path);
      if (path.startsWith("/v1/admin/subscribers")) {
        return {
          subscribers: [],
          summary: { total: 0, providers: [] },
          pagination: { nextCursor: null }
        };
      }
      if (path === "/v1/admin/billing/readiness") {
        return {
          mode: "test",
          checkoutEnabled: false,
          taxCollectionEnabled: false,
          configured: {},
          invoiceTaxEvidence: {},
          taxChangePreviews: {},
          failedWebhookEvents: 0
        };
      }
      return { evidence: [], truncated: false };
    }
  };
  globalThis.document = { documentElement: { lang: "en" } };
  const controller = mountPodcastAudienceBilling({
    root,
    client,
    apiOrigin: "https://api.example.test",
    text: (key, fallback) => fallback || key,
    setStatus(target, message, error = false) {
      if (!target) return;
      target.textContent = message;
      target.error = error;
    },
    friendlyError: (error) => error.message,
    escapeHtml: (value) => String(value ?? ""),
    humanizeCode: (value) => String(value || "").replaceAll("_", " "),
    getSelectedShowId: () => showId,
    isSuperAdmin: () => superAdmin,
    ApiError: Error,
    requestCredentialedBlob: async () => ({ blob: new Blob() }),
    triggerBlobDownload: () => "fixture.csv",
    fetchImpl: async () => new Response()
  });
  return {
    billingExport,
    billingRoot,
    controller,
    requests,
    subscribersExport,
    subscribersMore,
    subscribersRoot
  };
}

function element() {
  const listeners = new Map();
  let html = "";
  return {
    disabled: false,
    hidden: false,
    textContent: "",
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeAttribute(name) {
      if (name === "disabled") this.disabled = false;
    },
    setAttribute(name) {
      if (name === "disabled") this.disabled = true;
    },
    replaceChildren() {
      html = "";
    },
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = String(value);
    }
  };
}
