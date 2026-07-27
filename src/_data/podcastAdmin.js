module.exports = {
  apiOrigin:
    process.env.PODCAST_ADMIN_API_ORIGIN
    || require("./podcastApi.js").apiOrigin,
  turnstileSiteKey: process.env.PODCAST_ADMIN_TURNSTILE_SITE_KEY || ""
};
