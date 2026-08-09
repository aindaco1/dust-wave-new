import { spawnSync } from "node:child_process";

import {
  validatePodcastStagingTurnstileWidget
} from "./lib/podcast-staging-turnstile.mjs";

const STAGING_API_ORIGIN =
  "https://dust-wave-podcast-staging.jogo.workers.dev";
const explicitAssetRevision = String(
  process.env.DUST_WAVE_ASSET_VERSION
  || process.env.GITHUB_SHA
  || ""
).trim();
const gitRevisionResult = explicitAssetRevision
  ? null
  : spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
const assetRevision = explicitAssetRevision
  || String(gitRevisionResult?.stdout || "").trim();
const turnstileSiteKey = String(
  process.env.PODCAST_STAGING_TURNSTILE_SITE_KEY || ""
).trim();

if (!/^(?:[A-Fa-f0-9]{40}|[A-Fa-f0-9]{64})$/.test(assetRevision)) {
  throw new Error(
    "The isolated staging build requires an exact Git commit SHA from "
    + "DUST_WAVE_ASSET_VERSION, GITHUB_SHA, or the current checkout."
  );
}

if (!/^[A-Za-z0-9_-]{1,128}$/.test(turnstileSiteKey)) {
  throw new Error(
    "PODCAST_STAGING_TURNSTILE_SITE_KEY must contain the public staging "
    + "Turnstile site key."
  );
}

const wranglerCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const widgetListResult = spawnSync(
  wranglerCommand,
  [
    "--yes",
    "wrangler@4.118.0",
    "turnstile",
    "widget",
    "list",
    "--json"
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }
);

if (widgetListResult.error) throw widgetListResult.error;
if (widgetListResult.signal) {
  throw new Error(
    `Turnstile widget verification ended after signal ${widgetListResult.signal}.`
  );
}
if (widgetListResult.status !== 0) {
  throw new Error(
    "Cloudflare Turnstile widget verification failed. Confirm Wrangler "
    + "authentication and retry."
  );
}

let widgets;
try {
  widgets = JSON.parse(widgetListResult.stdout);
} catch {
  throw new Error("Cloudflare returned invalid Turnstile widget metadata.");
}
validatePodcastStagingTurnstileWidget(widgets, turnstileSiteKey);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build:ci"], {
  env: {
    ...process.env,
    PODCAST_STAGING_BUILD: "true",
    DUST_WAVE_ASSET_VERSION: assetRevision,
    PODCAST_ADMIN_API_ORIGIN: STAGING_API_ORIGIN,
    PODCAST_ADMIN_TURNSTILE_SITE_KEY: "",
    PODCAST_CHECKOUT_TURNSTILE_SITE_KEY: turnstileSiteKey,
    PODCAST_CHECKOUT_TEST_POSTAL_CODE: "87120",
    PODCAST_MEMBER_API_ORIGIN: STAGING_API_ORIGIN,
    PODCAST_MEMBER_TURNSTILE_SITE_KEY: turnstileSiteKey,
    PODCAST_PUBLIC_API_ORIGIN: STAGING_API_ORIGIN
  },
  stdio: "inherit"
});

if (result.error) throw result.error;
if (result.signal) {
  throw new Error(`Staging build ended after signal ${result.signal}.`);
}
process.exitCode = result.status ?? 1;
