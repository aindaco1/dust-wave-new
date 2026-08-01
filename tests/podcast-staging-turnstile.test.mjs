import assert from "node:assert/strict";
import test from "node:test";

import {
  validatePodcastStagingTurnstileWidget
} from "../scripts/lib/podcast-staging-turnstile.mjs";

const siteKey = "0x4AAAAAADpodcast_staging_fixture";

function widget(overrides = {}) {
  return {
    sitekey: siteKey,
    name: "Dust Wave Podcasts staging",
    domains: ["dust-wave-website-staging.pages.dev"],
    mode: "managed",
    clearance_level: "no_clearance",
    region: "world",
    ...overrides
  };
}

test("accepts only the exact Podcast staging widget policy", () => {
  assert.deepEqual(
    validatePodcastStagingTurnstileWidget([widget()], siteKey),
    {
      sitekey: siteKey,
      name: "Dust Wave Podcasts staging",
      domains: ["dust-wave-website-staging.pages.dev"],
      mode: "managed",
      clearanceLevel: "no_clearance",
      region: "world"
    }
  );
});

test("rejects a Pool widget even when its public key is well formed", () => {
  assert.throws(
    () => validatePodcastStagingTurnstileWidget([
      widget({
        name: "The Pool admin login",
        domains: ["pool.dustwave.xyz"]
      })
    ], siteKey),
    /not the exact Dust Wave Podcast staging Turnstile widget policy/
  );
});

test("rejects expanded hostnames or weaker widget policy", () => {
  for (const candidate of [
    widget({
      domains: [
        "dust-wave-website-staging.pages.dev",
        "unrelated.example"
      ]
    }),
    widget({ mode: "invisible" }),
    widget({ clearance_level: "managed" }),
    widget({ region: "china" })
  ]) {
    assert.throws(
      () => validatePodcastStagingTurnstileWidget([candidate], siteKey),
      /not the exact Dust Wave Podcast staging Turnstile widget policy/
    );
  }
});

test("rejects missing or duplicate site-key matches", () => {
  assert.throws(
    () => validatePodcastStagingTurnstileWidget([], siteKey),
    /must identify exactly one widget/
  );
  assert.throws(
    () => validatePodcastStagingTurnstileWidget(
      [widget(), widget()],
      siteKey
    ),
    /must identify exactly one widget/
  );
});

