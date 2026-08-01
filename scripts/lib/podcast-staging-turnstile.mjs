export const PODCAST_STAGING_TURNSTILE_POLICY = Object.freeze({
  name: "Dust Wave Podcasts staging",
  domains: Object.freeze(["dust-wave-website-staging.pages.dev"]),
  mode: "managed",
  clearanceLevel: "no_clearance",
  region: "world"
});

export function validatePodcastStagingTurnstileWidget(widgets, siteKey) {
  if (!Array.isArray(widgets)) {
    throw new TypeError("Cloudflare Turnstile widget metadata must be an array.");
  }

  const matches = widgets.filter((widget) => widget?.sitekey === siteKey);
  if (matches.length !== 1) {
    throw new Error(
      "The Podcast staging Turnstile site key must identify exactly one widget."
    );
  }

  const [widget] = matches;
  const domains = Array.isArray(widget.domains)
    ? [...widget.domains].sort()
    : [];
  const expectedDomains = [...PODCAST_STAGING_TURNSTILE_POLICY.domains].sort();
  const exactPolicy =
    widget.name === PODCAST_STAGING_TURNSTILE_POLICY.name
    && JSON.stringify(domains) === JSON.stringify(expectedDomains)
    && widget.mode === PODCAST_STAGING_TURNSTILE_POLICY.mode
    && widget.clearance_level
      === PODCAST_STAGING_TURNSTILE_POLICY.clearanceLevel
    && widget.region === PODCAST_STAGING_TURNSTILE_POLICY.region;

  if (!exactPolicy) {
    throw new Error(
      "The supplied site key is not the exact Dust Wave Podcast staging "
      + "Turnstile widget policy."
    );
  }

  return Object.freeze({
    sitekey: widget.sitekey,
    name: widget.name,
    domains: Object.freeze(domains),
    mode: widget.mode,
    clearanceLevel: widget.clearance_level,
    region: widget.region
  });
}

