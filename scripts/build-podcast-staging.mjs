import { spawnSync } from "node:child_process";

const STAGING_API_ORIGIN =
  "https://dust-wave-podcast-staging.jogo.workers.dev";
const turnstileSiteKey = String(
  process.env.PODCAST_STAGING_TURNSTILE_SITE_KEY || ""
).trim();

if (!/^[A-Za-z0-9_-]{1,128}$/.test(turnstileSiteKey)) {
  throw new Error(
    "PODCAST_STAGING_TURNSTILE_SITE_KEY must contain the public staging "
    + "Turnstile site key."
  );
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["run", "build"], {
  env: {
    ...process.env,
    PODCAST_ADMIN_API_ORIGIN: STAGING_API_ORIGIN,
    PODCAST_ADMIN_TURNSTILE_SITE_KEY: turnstileSiteKey,
    PODCAST_CHECKOUT_TURNSTILE_SITE_KEY: turnstileSiteKey,
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
