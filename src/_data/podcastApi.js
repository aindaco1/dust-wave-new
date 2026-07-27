const apiOrigin =
  process.env.PODCAST_PUBLIC_API_ORIGIN
  || process.env.PODCAST_MEMBER_API_ORIGIN
  || process.env.PODCAST_ADMIN_API_ORIGIN
  || "https://feeds.dustwave.xyz";

module.exports = { apiOrigin };
