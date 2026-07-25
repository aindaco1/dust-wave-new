module.exports = {
  apiOrigin:
    process.env.PODCAST_MEMBER_API_ORIGIN
    || process.env.PODCAST_ADMIN_API_ORIGIN
    || "https://feeds.dustwave.xyz",
  turnstileSiteKey:
    process.env.PODCAST_MEMBER_TURNSTILE_SITE_KEY
    || process.env.PODCAST_ADMIN_TURNSTILE_SITE_KEY
    || "",
  checkoutTurnstileSiteKey:
    process.env.PODCAST_CHECKOUT_TURNSTILE_SITE_KEY
    || process.env.PODCAST_MEMBER_TURNSTILE_SITE_KEY
    || process.env.PODCAST_ADMIN_TURNSTILE_SITE_KEY
    || ""
};
