import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const CLOUDFLARE_RULE_REF =
  "dust_wave_authenticated_shell_response_headers";
export const CLOUDFLARE_RULE_PHASE = "http_response_headers_transform";
export const PRODUCTION_HOSTNAME = "dustwave.xyz";
export const AUTHENTICATED_ROUTE_PATTERNS = Object.freeze([
  "/admin/*",
  "/es/admin/*",
  "/podcasts/account/*",
  "/es/podcasts/account/*"
]);

const RULE_DESCRIPTION =
  "Enforce Dust Wave authenticated-shell response headers";
const API_BASE_URL = "https://api.cloudflare.com/client/v4";

function fail(message) {
  throw new Error(message);
}

function normalizeHeadersText(headersText) {
  return String(headersText || "").replaceAll("\r\n", "\n");
}

export function parseHeaderBlock(headersText, routePattern) {
  const normalized = normalizeHeadersText(headersText);
  const marker = `${routePattern}\n`;
  const start = normalized.indexOf(marker);
  if (start === -1) {
    fail(`Missing _headers rule for ${routePattern}.`);
  }

  const nextRule = normalized.indexOf("\n/", start + marker.length);
  const block = normalized.slice(
    start + marker.length,
    nextRule === -1 ? undefined : nextRule
  );
  const headers = {};

  for (const line of block.split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s+/.test(line)) break;

    const separator = line.indexOf(":");
    if (separator === -1) {
      fail(`Invalid header line in ${routePattern}: ${line.trim()}`);
    }

    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!name || !value) {
      fail(`Invalid header line in ${routePattern}: ${line.trim()}`);
    }

    const duplicate = Object.keys(headers).find(
      (candidate) => candidate.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      fail(`Duplicate ${name} header in ${routePattern}.`);
    }
    headers[name] = value;
  }

  if (Object.keys(headers).length === 0) {
    fail(`No response headers found for ${routePattern}.`);
  }
  return headers;
}

function assertMatchingRouteHeaders(routeHeaders) {
  const [baseline, ...remaining] = routeHeaders;
  const expected = JSON.stringify(baseline);
  for (let index = 0; index < remaining.length; index += 1) {
    if (JSON.stringify(remaining[index]) !== expected) {
      fail(
        `${AUTHENTICATED_ROUTE_PATTERNS[index + 1]} must match `
        + `${AUTHENTICATED_ROUTE_PATTERNS[0]} before Cloudflare sync.`
      );
    }
  }
}

function routeExpression(routePattern) {
  const prefix = routePattern.slice(0, -2);
  return [
    `http.request.uri.path eq "${prefix}"`,
    `starts_with(http.request.uri.path, "${prefix}/")`
  ].join(" or ");
}

export function buildCloudflareResponseHeaderRule(headersText) {
  const routeHeaders = AUTHENTICATED_ROUTE_PATTERNS.map((routePattern) =>
    parseHeaderBlock(headersText, routePattern)
  );
  assertMatchingRouteHeaders(routeHeaders);

  const headers = Object.fromEntries(
    Object.entries(routeHeaders[0]).map(([name, value]) => [
      name,
      { operation: "set", value }
    ])
  );
  headers["Access-Control-Allow-Origin"] = { operation: "remove" };

  const pathExpression = AUTHENTICATED_ROUTE_PATTERNS
    .map(routeExpression)
    .join(" or ");

  return {
    ref: CLOUDFLARE_RULE_REF,
    description: RULE_DESCRIPTION,
    expression: `(http.host eq "${PRODUCTION_HOSTNAME}" and (${pathExpression}))`,
    action: "rewrite",
    action_parameters: { headers },
    enabled: true
  };
}

function normalizedRule(rule) {
  const normalizedHeaders = {};
  const sourceHeaders = rule?.action_parameters?.headers || {};
  for (const name of Object.keys(sourceHeaders).sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  )) {
    const modification = sourceHeaders[name] || {};
    normalizedHeaders[name.toLowerCase()] = {
      operation: modification.operation,
      ...("value" in modification ? { value: modification.value } : {}),
      ...("expression" in modification
        ? { expression: modification.expression }
        : {})
    };
  }

  return {
    ref: rule?.ref,
    description: rule?.description,
    expression: rule?.expression,
    action: rule?.action,
    action_parameters: { headers: normalizedHeaders },
    enabled: rule?.enabled !== false
  };
}

export function cloudflareRulesMatch(actual, desired) {
  return JSON.stringify(normalizedRule(actual))
    === JSON.stringify(normalizedRule(desired));
}

export function cloudflareAuthHeaders(environment = process.env) {
  const token = String(
    environment.CLOUDFLARE_TRANSFORM_RULES_TOKEN
    || environment.CLOUDFLARE_API_TOKEN
    || ""
  ).trim();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  const email = String(environment.CLOUDFLARE_EMAIL || "").trim();
  const key = String(environment.CLOUDFLARE_KEY || "").trim();
  if (!email || !key) {
    fail(
      "Cloudflare Transform Rules credentials are missing. Set "
      + "CLOUDFLARE_TRANSFORM_RULES_TOKEN or both CLOUDFLARE_EMAIL and "
      + "CLOUDFLARE_KEY."
    );
  }
  return {
    "X-Auth-Email": email,
    "X-Auth-Key": key
  };
}

function cloudflareError(payload, status) {
  const messages = [
    ...(Array.isArray(payload?.errors) ? payload.errors : []),
    ...(Array.isArray(payload?.messages) ? payload.messages : [])
  ]
    .map((entry) => {
      const code = entry?.code ? ` ${entry.code}` : "";
      return `${entry?.message || "Unknown Cloudflare API error"}${code}`;
    })
    .join("; ");
  return messages || `Cloudflare API returned HTTP ${status}.`;
}

async function cloudflareRequest({
  apiBaseUrl,
  authHeaders,
  fetchImpl,
  method = "GET",
  path,
  body,
  allowNotFound = false
}) {
  const response = await fetchImpl(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));

  if (allowNotFound && response.status === 404) return null;
  if (!response.ok || payload.success !== true) {
    fail(cloudflareError(payload, response.status));
  }
  return payload.result;
}

function verifyManagedRule(ruleset, desiredRule) {
  const matchingRules = (ruleset?.rules || []).filter(
    (rule) => rule.ref === CLOUDFLARE_RULE_REF
  );
  if (matchingRules.length !== 1) {
    fail(
      `Expected one ${CLOUDFLARE_RULE_REF} rule after sync; found `
      + `${matchingRules.length}.`
    );
  }
  if (!cloudflareRulesMatch(matchingRules[0], desiredRule)) {
    fail("Cloudflare returned a response-header rule that does not match _headers.");
  }
  if (ruleset.rules.at(-1)?.id !== matchingRules[0].id) {
    fail("The managed Cloudflare response-header rule is not last in its phase.");
  }
  return matchingRules[0];
}

export async function syncCloudflareResponseHeaders({
  zoneId,
  authHeaders,
  headersText,
  fetchImpl = globalThis.fetch,
  apiBaseUrl = API_BASE_URL,
  logger = console
}) {
  const normalizedZoneId = String(zoneId || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(normalizedZoneId)) {
    fail("Cloudflare zone ID is missing or invalid.");
  }
  if (typeof fetchImpl !== "function") {
    fail("A Fetch API implementation is required.");
  }

  const desiredRule = buildCloudflareResponseHeaderRule(headersText);
  const phasePath =
    `/zones/${normalizedZoneId}/rulesets/phases/`
    + `${CLOUDFLARE_RULE_PHASE}/entrypoint`;
  const existingRuleset = await cloudflareRequest({
    apiBaseUrl,
    authHeaders,
    fetchImpl,
    path: phasePath,
    allowNotFound: true
  });

  let operation = "unchanged";
  if (!existingRuleset) {
    await cloudflareRequest({
      apiBaseUrl,
      authHeaders,
      fetchImpl,
      method: "POST",
      path: `/zones/${normalizedZoneId}/rulesets`,
      body: {
        name: "Zone-level Response Headers Transform Ruleset",
        description:
          "Zone entry point for Dust Wave response-header transform rules.",
        kind: "zone",
        phase: CLOUDFLARE_RULE_PHASE,
        rules: [desiredRule]
      }
    });
    operation = "created";
  } else {
    const matchingRules = (existingRuleset.rules || []).filter(
      (rule) => rule.ref === CLOUDFLARE_RULE_REF
    );
    if (matchingRules.length > 1) {
      fail(
        `Cloudflare has ${matchingRules.length} rules with ref `
        + `${CLOUDFLARE_RULE_REF}; refusing an ambiguous update.`
      );
    }

    const existingRule = matchingRules[0];
    if (!existingRule) {
      await cloudflareRequest({
        apiBaseUrl,
        authHeaders,
        fetchImpl,
        method: "POST",
        path:
          `/zones/${normalizedZoneId}/rulesets/${existingRuleset.id}/rules`,
        body: desiredRule
      });
      operation = "created";
    } else {
      const isLastRule =
        existingRuleset.rules.at(-1)?.id === existingRule.id;
      if (!cloudflareRulesMatch(existingRule, desiredRule) || !isLastRule) {
        await cloudflareRequest({
          apiBaseUrl,
          authHeaders,
          fetchImpl,
          method: "PATCH",
          path:
            `/zones/${normalizedZoneId}/rulesets/${existingRuleset.id}`
            + `/rules/${existingRule.id}`,
          body: {
            ...desiredRule,
            position: { after: "" }
          }
        });
        operation = "updated";
      }
    }
  }

  const deployedRuleset = await cloudflareRequest({
    apiBaseUrl,
    authHeaders,
    fetchImpl,
    path: phasePath
  });
  const deployedRule = verifyManagedRule(deployedRuleset, desiredRule);
  logger.log(
    `Cloudflare authenticated-route response headers ${operation} `
    + `(ruleset ${deployedRuleset.id}, rule ${deployedRule.id}).`
  );
  return {
    operation,
    rulesetId: deployedRuleset.id,
    ruleId: deployedRule.id
  };
}

async function run() {
  const headersText = await readFile(
    new URL("../_headers", import.meta.url),
    "utf8"
  );
  await syncCloudflareResponseHeaders({
    zoneId: process.env.CLOUDFLARE_ZONE,
    authHeaders: cloudflareAuthHeaders(),
    headersText
  });
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
