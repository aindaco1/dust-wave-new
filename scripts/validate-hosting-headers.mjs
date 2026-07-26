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

for (const route of [
  "/admin/*",
  "/podcasts/account/*",
  "/es/podcasts/account/*"
]) {
  const start = headers.indexOf(`${route}\n`);
  assert.notEqual(start, -1, `missing private header rule for ${route}`);
  const nextRule = headers.indexOf("\n/", start + route.length + 1);
  const block = headers.slice(start, nextRule === -1 ? undefined : nextRule);
  for (const expected of requiredPrivateHeaders) {
    assert.match(block, expected, `${route} is missing ${expected}`);
  }
}

assert.match(headers, /https:\/\/:project\.pages\.dev\/\*/);
assert.match(headers, /https:\/\/:version\.:project\.pages\.dev\/\*/);
assert.doesNotMatch(headers, /\/news\/podcasts\/embed/);
assert.doesNotMatch(headers, /Access-Control-Allow-Origin/);
assert.match(gulpfile, /src\(\['\.\/CNAME', '\.\/_headers'\]/);

console.log("Hosting header validation passed.");
