import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [page, script, styles, configuration] = await Promise.all([
  readFile(new URL("../src/podcasts/show.njk", import.meta.url), "utf8"),
  readFile(new URL("../src/js/podcast-checkout.js", import.meta.url), "utf8"),
  readFile(
    new URL("../src/scss/themes/base/_style-theme.scss", import.meta.url),
    "utf8"
  ),
  readFile(
    new URL("../src/_data/podcastMember.js", import.meta.url),
    "utf8"
  )
]);

assert.match(page, /data-podcast-checkout-root/);
assert.match(page, /data-api-origin="\{\{ podcastMember\.apiOrigin \}\}"/);
assert.match(page, /data-show-slug="\{\{ show\.slug \}\}"/);
assert.match(
  page,
  /data-turnstile-site-key="\{\{ podcastMember\.checkoutTurnstileSiteKey \}\}"/
);
assert.match(page, /data-podcast-checkout-form hidden/);
assert.match(page, /name="billingPeriod"/);
assert.match(page, /name="email"/);
assert.match(page, /name="country"/);
assert.match(page, /name="postalCode"/);
assert.match(page, /name="city"/);
assert.match(page, /name="line1"/);
assert.match(page, /data-podcast-checkout-quote/);
assert.match(page, /aria-live="polite"/);
assert.match(page, /src="\/js\/podcast-checkout\.js\?v=\{\{ assets\.version/);

assert.match(script, /\/v1\/shows\/\$\{encodeURIComponent\(slug\)\}/);
assert.match(script, /\/tax\/quote/);
assert.match(script, /\/checkout/);
assert.match(script, /payload\.checkoutEnabled !== true/);
assert.match(script, /priceId: selection\.id/);
assert.match(script, /quoteSignature !== signature/);
assert.match(script, /podcast_subscription_checkout/);
assert.match(
  script,
  /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/
);
assert.match(script, /"checkout\.stripe\.com"/);
assert.match(script, /url\.hostname === expectedHost/);
assert.match(script, /url\.protocol === "https:"/);
assert.match(script, /globalThis\.location\.assign\(checkoutUrl\)/);
assert.match(script, /new Intl\.NumberFormat/);
assert.doesNotMatch(script, /localStorage|sessionStorage|innerHTML|console\./);
assert.doesNotMatch(script, /provider_customer|provider_subscription|stripe_price/);

assert.match(styles, /\.podcast-checkout__fields/);
assert.match(styles, /@media \(max-width: 35\.99rem\)/);
assert.match(styles, /:focus-visible/);
assert.match(configuration, /PODCAST_CHECKOUT_TURNSTILE_SITE_KEY/);

console.log("Podcast checkout validation passed.");
