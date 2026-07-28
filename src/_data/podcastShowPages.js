const shows = require("./podcastShows.json");
const i18nConfig = require("./i18n/config.json");

module.exports = shows.flatMap((show) =>
  i18nConfig.supportedLangs.map((language) => ({
    language,
    show,
    path:
      language === i18nConfig.defaultLang
        ? `/podcasts/${show.slug}/`
        : `/${language}/podcasts/${show.slug}/`
  }))
);
