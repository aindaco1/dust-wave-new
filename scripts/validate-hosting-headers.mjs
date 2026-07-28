import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  AUTHENTICATED_ROUTE_PATTERNS,
  buildCloudflareResponseHeaderRule,
  CLOUDFLARE_RULE_PHASE,
  CLOUDFLARE_RULE_REF
} from "./cloudflare-response-headers.mjs";

const [headers, gulpfile] = await Promise.all([
  readFile(new URL("../_headers", import.meta.url), "utf8"),
  readFile(new URL("../gulpfile.js", import.meta.url), "utf8")
]);

const requiredPrivateHeaders = [
  /Cache-Control: private, no-store, max-age=0/,
  /X-Frame-Options: DENY/,
  /X-Content-Type-Options: nosniff/,
  /Referrer-Policy: no-referrer/,
  /Permissions-Policy: camera=\(\), geolocation=\(\), microphone=\(\), payment=\(\), usb=\(\)/,
  /X-Robots-Tag: noindex, nofollow, noarchive/
];
const requiredCspDirectives = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' https://challenges.cloudflare.com https://dust-wave-podcast-staging.jogo.workers.dev https://feeds.dustwave.xyz",
  "font-src 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "frame-src https://challenges.cloudflare.com",
  "img-src 'self' data: blob: https://dust-wave-podcast-staging.jogo.workers.dev https://feeds.dustwave.xyz https://media.dustwave.xyz",
  "media-src 'self' blob: https://dust-wave-podcast-staging.jogo.workers.dev https://feeds.dustwave.xyz https://media.dustwave.xyz",
  "object-src 'none'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:"
];

function headerBlockFor(route) {
  const start = headers.indexOf(`${route}\n`);
  assert.notEqual(start, -1, `missing header rule for ${route}`);
  const nextRule = headers.indexOf("\n/", start + route.length + 1);
  return headers.slice(start, nextRule === -1 ? undefined : nextRule);
}

for (const route of AUTHENTICATED_ROUTE_PATTERNS) {
  const block = headerBlockFor(route);
  for (const expected of requiredPrivateHeaders) {
    assert.match(block, expected, `${route} is missing ${expected}`);
  }
  const csp = block
    .split("\n")
    .find((line) => line.trimStart().startsWith("Content-Security-Policy:"));
  assert(csp, `${route} is missing its Content Security Policy`);
  for (const directive of requiredCspDirectives) {
    assert(
      csp.includes(`${directive};`) || csp.endsWith(directive),
      `${route} CSP is missing ${directive}`
    );
  }
}

for (const [route, maxAge] of [
  ["/css/*", 3600],
  ["/js/*", 3600],
  ["/img/*", 86400],
  ["/fonts/*", 86400]
]) {
  const block = headerBlockFor(route);
  assert.match(
    block,
    new RegExp(`Cache-Control: public, max-age=${maxAge}, must-revalidate`),
    `${route} is missing its finite browser-cache policy`
  );
  assert.match(
    block,
    /X-Content-Type-Options: nosniff/,
    `${route} is missing MIME-sniffing protection`
  );
  assert.doesNotMatch(
    block,
    /immutable/,
    `${route} must not use immutable caching before assets are content-hashed`
  );
}

assert.match(headers, /https:\/\/:project\.pages\.dev\/\*/);
assert.match(headers, /https:\/\/:version\.:project\.pages\.dev\/\*/);
assert.doesNotMatch(headers, /\/news\/podcasts\/embed/);
assert.doesNotMatch(headers, /Access-Control-Allow-Origin/);
const cloudflareRule = buildCloudflareResponseHeaderRule(headers);
assert.equal(CLOUDFLARE_RULE_PHASE, "http_response_headers_transform");
assert.equal(
  cloudflareRule.ref,
  CLOUDFLARE_RULE_REF,
  "the production rule must keep a stable Cloudflare ref"
);
assert.equal(
  cloudflareRule.action_parameters.headers["Access-Control-Allow-Origin"]
    .operation,
  "remove",
  "authenticated production shells must not inherit GitHub Pages wildcard CORS"
);
assert.doesNotMatch(
  cloudflareRule.expression,
  /embed|\/news\//,
  "public Podcast pages and embeds must remain outside the production rule"
);
assert.equal(
  (headers.match(/^  Content-Security-Policy:/gm) || []).length,
  4,
  "CSP must remain scoped to the four authenticated shells"
);
assert.match(gulpfile, /src\(\['\.\/CNAME', '\.\/_headers'\]/);

console.log("Hosting header validation passed.");
