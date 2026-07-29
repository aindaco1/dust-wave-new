import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AUTHENTICATED_ROUTE_PATTERNS,
  buildCloudflareResponseHeaderRule,
  cloudflareAuthHeaders,
  cloudflareRulesMatch,
  CLOUDFLARE_RULE_PHASE,
  CLOUDFLARE_RULE_REF,
  syncCloudflareResponseHeaders
} from "../scripts/cloudflare-response-headers.mjs";
import {
  validateAuthenticatedResponse,
  validatePublicResponse
} from "../scripts/verify-production-response-headers.mjs";

const headersText = await readFile(
  new URL("../_headers", import.meta.url),
  "utf8"
);
const zoneId = "0123456789abcdef0123456789abcdef";
const authHeaders = { Authorization: "Bearer test-token" };

function apiResponse(result, status = 200) {
  return new Response(
    JSON.stringify({
      result,
      success: status >= 200 && status < 300,
      errors: status === 404 ? [{ code: 10014, message: "not found" }] : [],
      messages: []
    }),
    {
      status,
      headers: { "Content-Type": "application/json" }
    }
  );
}

function rulesetWith(rules) {
  return {
    id: "ruleset-id",
    name: "Response header transforms",
    kind: "zone",
    phase: CLOUDFLARE_RULE_PHASE,
    rules
  };
}

function deployedRule(overrides = {}) {
  return {
    id: "managed-rule-id",
    ...buildCloudflareResponseHeaderRule(headersText),
    ...overrides
  };
}

test("builds one production-only rule from the checked-in _headers policy", () => {
  const rule = buildCloudflareResponseHeaderRule(headersText);

  assert.equal(rule.ref, CLOUDFLARE_RULE_REF);
  assert.equal(rule.action, "rewrite");
  assert.match(rule.expression, /http\.host eq "dustwave\.xyz"/);
  for (const route of AUTHENTICATED_ROUTE_PATTERNS) {
    const prefix = route.slice(0, -2);
    assert.match(
      rule.expression,
      new RegExp(`starts_with\\(http\\.request\\.uri\\.path, "${prefix}/"\\)`)
    );
  }
  assert.doesNotMatch(rule.expression, /embed|\/news\//);
  assert.deepEqual(
    rule.action_parameters.headers["Access-Control-Allow-Origin"],
    { operation: "remove" }
  );
  assert.deepEqual(
    rule.action_parameters.headers["X-Frame-Options"],
    { operation: "set", value: "DENY" }
  );
});

test("refuses to deploy when authenticated route policies drift", () => {
  const driftedHeaders = headersText.replace(
    "/es/admin/*\n  Cache-Control: private, no-store, max-age=0",
    "/es/admin/*\n  Cache-Control: public, max-age=60"
  );
  assert.throws(
    () => buildCloudflareResponseHeaderRule(driftedHeaders),
    /must match/
  );
});

test("uses a scoped token when present and otherwise supports the legacy key", () => {
  assert.deepEqual(
    cloudflareAuthHeaders({
      CLOUDFLARE_TRANSFORM_RULES_TOKEN: "scoped-token",
      CLOUDFLARE_EMAIL: "ignored@example.com",
      CLOUDFLARE_KEY: "ignored"
    }),
    { Authorization: "Bearer scoped-token" }
  );
  assert.deepEqual(
    cloudflareAuthHeaders({
      CLOUDFLARE_EMAIL: "owner@example.com",
      CLOUDFLARE_KEY: "global-key"
    }),
    {
      "X-Auth-Email": "owner@example.com",
      "X-Auth-Key": "global-key"
    }
  );
  assert.throws(() => cloudflareAuthHeaders({}), /credentials are missing/);
});

test("creates the response-transform phase without replacing other phases", async () => {
  let currentRuleset = null;
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const method = options.method || "GET";
    const pathname = new URL(url).pathname;
    calls.push([method, pathname]);

    if (method === "GET" && pathname.endsWith("/entrypoint")) {
      return currentRuleset
        ? apiResponse(currentRuleset)
        : apiResponse(null, 404);
    }
    if (method === "POST" && pathname.endsWith("/rulesets")) {
      const body = JSON.parse(options.body);
      assert.equal(body.phase, CLOUDFLARE_RULE_PHASE);
      currentRuleset = rulesetWith([
        { id: "managed-rule-id", ...body.rules[0] }
      ]);
      return apiResponse(currentRuleset);
    }
    throw new Error(`Unexpected request: ${method} ${pathname}`);
  };

  const result = await syncCloudflareResponseHeaders({
    zoneId,
    authHeaders,
    headersText,
    fetchImpl,
    apiBaseUrl: "https://api.example.test",
    logger: { log() {} }
  });

  assert.equal(result.operation, "created");
  assert.deepEqual(calls.map(([method]) => method), ["GET", "POST", "GET"]);
});

test("leaves an identical last rule unchanged", async () => {
  const currentRuleset = rulesetWith([deployedRule()]);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push(options.method || "GET");
    return apiResponse(currentRuleset);
  };

  const result = await syncCloudflareResponseHeaders({
    zoneId,
    authHeaders,
    headersText,
    fetchImpl,
    apiBaseUrl: "https://api.example.test",
    logger: { log() {} }
  });

  assert.equal(result.operation, "unchanged");
  assert.deepEqual(calls, ["GET", "GET"]);
});

test("updates a stale last rule without sending an invalid position", async () => {
  let currentRuleset = rulesetWith([
    deployedRule({
      action_parameters: {
        headers: {
          "X-Frame-Options": { operation: "set", value: "SAMEORIGIN" }
        }
      }
    })
  ]);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const method = options.method || "GET";
    const pathname = new URL(url).pathname;
    calls.push([method, pathname]);

    if (method === "GET") return apiResponse(currentRuleset);
    if (method === "PATCH") {
      const body = JSON.parse(options.body);
      assert.equal("position" in body, false);
      assert.match(pathname, /\/rules\/managed-rule-id$/);
      currentRuleset = rulesetWith([
        { id: "managed-rule-id", ...body }
      ]);
      return apiResponse(currentRuleset);
    }
    throw new Error(`Unexpected request: ${method} ${pathname}`);
  };

  const result = await syncCloudflareResponseHeaders({
    zoneId,
    authHeaders,
    headersText,
    fetchImpl,
    apiBaseUrl: "https://api.example.test",
    logger: { log() {} }
  });

  assert.equal(result.operation, "updated");
  assert.deepEqual(
    calls.map(([method]) => method),
    ["GET", "PATCH", "GET"]
  );
  assert(
    cloudflareRulesMatch(
      currentRuleset.rules[0],
      buildCloudflareResponseHeaderRule(headersText)
    )
  );
});

test("patches only the owned rule and moves it after unrelated transforms", async () => {
  const unrelatedRule = {
    id: "unrelated-rule-id",
    ref: "some_other_rule",
    description: "Unrelated transform",
    expression: "true",
    action: "rewrite",
    action_parameters: {
      headers: { "X-Unrelated": { operation: "set", value: "preserved" } }
    },
    enabled: true
  };
  let currentRuleset = rulesetWith([
    deployedRule({
      action_parameters: {
        headers: {
          "X-Frame-Options": { operation: "set", value: "SAMEORIGIN" }
        }
      }
    }),
    unrelatedRule
  ]);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    const method = options.method || "GET";
    const pathname = new URL(url).pathname;
    calls.push([method, pathname]);

    if (method === "GET") return apiResponse(currentRuleset);
    if (method === "PATCH") {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.position, { after: "" });
      assert.match(pathname, /\/rules\/managed-rule-id$/);
      currentRuleset = rulesetWith([
        unrelatedRule,
        { id: "managed-rule-id", ...body }
      ]);
      delete currentRuleset.rules[1].position;
      return apiResponse(currentRuleset);
    }
    throw new Error(`Unexpected request: ${method} ${pathname}`);
  };

  const result = await syncCloudflareResponseHeaders({
    zoneId,
    authHeaders,
    headersText,
    fetchImpl,
    apiBaseUrl: "https://api.example.test",
    logger: { log() {} }
  });

  assert.equal(result.operation, "updated");
  assert.equal(currentRuleset.rules[0], unrelatedRule);
  assert.equal(currentRuleset.rules[1].ref, CLOUDFLARE_RULE_REF);
  assert.equal(calls.filter(([method]) => method === "PATCH").length, 1);
  assert(
    cloudflareRulesMatch(
      currentRuleset.rules[1],
      buildCloudflareResponseHeaderRule(headersText)
    )
  );
});

test("validates private headers while keeping a public Podcast page frameable", () => {
  const desiredRule = buildCloudflareResponseHeaderRule(headersText);
  const privateHeaders = new Headers();
  for (const [name, operation] of Object.entries(
    desiredRule.action_parameters.headers
  )) {
    if (operation.operation === "set") {
      privateHeaders.set(name, operation.value);
    }
  }
  validateAuthenticatedResponse(
    new Response(null, { status: 200, headers: privateHeaders }),
    desiredRule,
    "https://dustwave.xyz/admin/podcasts/"
  );

  assert.throws(
    () =>
      validateAuthenticatedResponse(
        new Response(null, {
          status: 200,
          headers: {
            ...Object.fromEntries(privateHeaders),
            "X-Frame-Options": "SAMEORIGIN"
          }
        }),
        desiredRule,
        "https://dustwave.xyz/admin/podcasts/"
      ),
    /unexpected X-Frame-Options/
  );

  validatePublicResponse(
    new Response(null, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" }
    }),
    "https://dustwave.xyz/podcasts/opera-en-la-selva/"
  );
  assert.throws(
    () =>
      validatePublicResponse(
        new Response(null, {
          status: 200,
          headers: { "X-Frame-Options": "DENY" }
        }),
        "https://dustwave.xyz/podcasts/opera-en-la-selva/"
      ),
    /authenticated-only X-Frame-Options/
  );
});
