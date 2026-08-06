import assert from "node:assert/strict";

import {
  PODCAST_I18N_PAGES,
  validatePodcastI18nPage,
  validatePodcastI18nShowPair
} from "./lib/podcast-i18n-page-contract.mjs";

const originArgument = process.argv.find((argument) =>
  argument.startsWith("--origin=")
);
const origin = new URL(
  originArgument?.slice("--origin=".length)
  || "https://dust-wave-website-staging.pages.dev"
);
assert.equal(origin.protocol, "https:");
assert.equal(origin.username, "");
assert.equal(origin.password, "");

const deployedPages = new Map();
for (const contract of PODCAST_I18N_PAGES) {
  const url = new URL(contract.pathname, origin);
  const response = await fetch(url, {
    headers: { accept: "text/html" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000)
  });
  assert.equal(response.status, 200, `${url} must return 200`);
  assert.match(
    response.headers.get("content-type") || "",
    /^text\/html\b/i,
    `${url} must return HTML`
  );
  const html = await response.text();
  validatePodcastI18nPage(html, contract, url.href);
  deployedPages.set(contract.pathname, html);
}
validatePodcastI18nShowPair(
  deployedPages.get("/podcasts/opera-en-la-selva/"),
  deployedPages.get("/es/podcasts/opera-en-la-selva/")
);

console.log(
  `Deployed podcast i18n validation passed for ${PODCAST_I18N_PAGES.length} pages at ${origin.origin}.`
);
