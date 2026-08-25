import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  sharedAdminShellImportPattern
} from "./lib/shared-admin-shell-version.mjs";

const [
  page,
  layout,
  siteFooter,
  script,
  memberStyles,
  buildPipeline
] = await Promise.all([
  readFile(new URL("../src/podcasts/account.njk", import.meta.url), "utf8"),
  readFile(
    new URL("../src/_includes/layouts/podcast-member.njk", import.meta.url),
    "utf8"
  ),
  readFile(
    new URL(
      "../src/_includes/snippets/site-footer.njk",
      import.meta.url
    ),
    "utf8"
  ),
  readFile(new URL("../src/js/podcast-member.js", import.meta.url), "utf8"),
  readFile(
    new URL("../src/scss/themes/base/_podcast-member.scss", import.meta.url),
    "utf8"
  ),
  readFile(new URL("../gulpfile.js", import.meta.url), "utf8")
]);

assert.match(page, /permalink: "\{\{ i18n\.config\.pages\.podcastAccount\[language\] \}\}"/);
assert.match(page, /data: i18n\.config\.supportedLangs/);
assert.match(page, /data-podcast-member-login-form/);
assert.match(
  page,
  /class="podcast-auth-turnstile podcast-member__turnstile"/
);
assert.match(page, /data-podcast-pool-redemption-form/);
assert.match(page, /autocomplete="off"/);
assert.match(page, /maxlength="42"/);
assert.match(page, /aria-live="polite"/);
assert.match(layout, /noindex,nofollow,noarchive/);
assert.match(layout, /name="referrer" content="no-referrer"/);
assert.match(layout, /snippets\/site-footer\.njk/);
assert.match(siteFooter, /class="site-footer"/);
assert.match(siteFooter, /class="site-footer__item/g);
assert.match(siteFooter, /snippets\/language-switcher\.njk/);
assert.match(page, /cssBundle: podcast-member/);
assert.match(page, /customFont: true/);
assert.doesNotMatch(page, /disableTypekit: true/);
assert.match(script, sharedAdminShellImportPattern("api-client"));
assert.match(
  script,
  sharedAdminShellImportPattern("passwordless-session")
);
assert.match(script, sharedAdminShellImportPattern("turnstile"));
assert.match(
  script,
  /size: responsiveTurnstileSize\(turnstileContainer\)/
);
assert.match(script, /\/v1\/member\/auth\/start/);
assert.match(script, /\/v1\/member\/auth\/exchange/);
assert.match(script, /\/v1\/member\/session/);
assert.match(script, /\/v1\/member\/logout/);
assert.match(script, /\/v1\/member\/shows\/\$\{slug\}\/feed/);
assert.match(script, /\/v1\/member\/shows\/\$\{slug\}\/billing\/portal/);
assert.match(script, /\/v1\/member\/shows\/\$\{slug\}\/notifications/);
assert.match(script, /announcementNotificationsEnabled/);
assert.match(script, /translate\("member\.notificationsEnabled"\)/);
assert.match(script, /email\.autocomplete = "email"/);
assert.match(script, /emailLabel\.hidden = !checkbox\.checked/);
assert.match(script, /email\.required = checkbox\.checked/);
assert.match(
  memberStyles,
  /\.podcast-member__notification-email\[hidden\]\s*\{[^}]*display: none !important;/s
);
assert.match(
  script,
  /email: checkbox\.checked \? email\.value : undefined/
);
assert.match(script, /\/v1\/member\/redemptions\/pool/);
assert.match(script, /result\?\.poolRedemptionEnabled !== true/);
assert.match(buildPipeline, /`\$\{DIR\.dist\}\/js\/\*\*\/\*\.js`/);
assert.match(script, /subscription\.hasStripeBilling/);
assert.match(script, /"billing\.stripe\.com"/);
assert.match(script, /url\.hostname === expectedHost/);
assert.match(script, /url\.protocol === "https:"/);
assert.match(script, /navigator\.clipboard\.writeText/);
assert.match(script, /readOnly = true/);
assert.match(script, /session\.clearFragment\(\)/);
assert.doesNotMatch(script, /localStorage|sessionStorage|innerHTML/);
assert.doesNotMatch(script, /console\./);
assert.doesNotMatch(script, /provider_customer|provider_subscription|private_feed_token/);

console.log("Podcast member account validation passed.");
