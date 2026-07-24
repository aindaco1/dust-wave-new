import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, layout, script] = await Promise.all([
  readFile(new URL("../src/podcasts/account.njk", import.meta.url), "utf8"),
  readFile(
    new URL("../src/_includes/layouts/podcast-member.njk", import.meta.url),
    "utf8"
  ),
  readFile(new URL("../src/js/podcast-member.js", import.meta.url), "utf8")
]);

assert.match(page, /permalink: podcasts\/account\/index\.html/);
assert.match(page, /data-podcast-member-login-form/);
assert.match(page, /aria-live="polite"/);
assert.match(layout, /noindex,nofollow,noarchive/);
assert.match(layout, /name="referrer" content="no-referrer"/);
assert.match(script, /\/v1\/member\/auth\/start/);
assert.match(script, /\/v1\/member\/auth\/exchange/);
assert.match(script, /\/v1\/member\/session/);
assert.match(script, /\/v1\/member\/logout/);
assert.match(script, /\/v1\/member\/shows\/\$\{slug\}\/feed/);
assert.match(script, /navigator\.clipboard\.writeText/);
assert.match(script, /readOnly = true/);
assert.match(script, /session\.clearFragment\(\)/);
assert.doesNotMatch(script, /localStorage|sessionStorage|innerHTML/);
assert.doesNotMatch(script, /provider_customer|provider_subscription|private_feed_token/);

console.log("Podcast member account validation passed.");
