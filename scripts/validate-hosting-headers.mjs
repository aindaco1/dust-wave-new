import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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

function headerBlockFor(route) {
  const start = headers.indexOf(`${route}\n`);
  assert.notEqual(start, -1, `missing header rule for ${route}`);
  const nextRule = headers.indexOf("\n/", start + route.length + 1);
  return headers.slice(start, nextRule === -1 ? undefined : nextRule);
}

for (const route of [
  "/admin/*",
  "/es/admin/*",
  "/podcasts/account/*",
  "/es/podcasts/account/*"
]) {
  const block = headerBlockFor(route);
  for (const expected of requiredPrivateHeaders) {
    assert.match(block, expected, `${route} is missing ${expected}`);
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
assert.match(gulpfile, /src\(\['\.\/CNAME', '\.\/_headers'\]/);

console.log("Hosting header validation passed.");
