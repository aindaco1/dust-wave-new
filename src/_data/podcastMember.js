const apiOrigin =
  process.env.PODCAST_MEMBER_API_ORIGIN
  || require("./podcastApi.js").apiOrigin;

module.exports = {
  apiOrigin,
  turnstileSiteKey:
    process.env.PODCAST_MEMBER_TURNSTILE_SITE_KEY
    || process.env.PODCAST_ADMIN_TURNSTILE_SITE_KEY
    || "",
  checkoutTurnstileSiteKey:
    process.env.PODCAST_CHECKOUT_TURNSTILE_SITE_KEY
    || process.env.PODCAST_MEMBER_TURNSTILE_SITE_KEY
    || process.env.PODCAST_ADMIN_TURNSTILE_SITE_KEY
    || "",
  checkoutTestPostalCode:
    process.env.PODCAST_CHECKOUT_TEST_POSTAL_CODE || ""
};
