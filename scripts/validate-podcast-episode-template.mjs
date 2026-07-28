import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import nunjucks from 'nunjucks';
import safeJsonLdModule from '../lib/safe-json-ld.cjs';

const { safeJsonLd } = safeJsonLdModule;

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(repositoryRoot, 'src/news/podcasts/episode.njk');
const embedTemplatePath = path.join(
  repositoryRoot,
  'src/news/podcasts/embed.njk'
);
const includePath = path.join(repositoryRoot, 'src/_includes');
const source = await readFile(templatePath, 'utf8');
const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
const embedSource = await readFile(embedTemplatePath, 'utf8');
const embedBody = embedSource.replace(/^---\n[\s\S]*?\n---\n/, '');
const i18n = {
  en: JSON.parse(
    await readFile(path.join(repositoryRoot, 'src/_data/i18n/en.json'), 'utf8')
  ),
  es: JSON.parse(
    await readFile(path.join(repositoryRoot, 'src/_data/i18n/es.json'), 'utf8')
  )
};
assert.match(
  source,
  /og_image: "\/img\/podcasts\/\{\{ episode\.showSlug \}\}\/\{\{ episode\.slug \}\}\/social-card\.png"/
);
assert.match(source, /og_image_width: 1200/);
assert.match(source, /og_image_height: 630/);
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(includePath),
  { autoescape: true, throwOnUndefined: true }
);

environment.addFilter('podcastShowBySlug', (shows, showSlug) => {
  return shows.find((show) => show.slug === showSlug) ?? null;
});
environment.addFilter('readablePodcastDate', () => 'July 23, 2026');
environment.addFilter('safeJsonLd', safeJsonLd);
environment.addFilter('t', (translations, language, key, variables = {}) => {
  const value = String(key)
    .split('.')
    .reduce((result, part) => result?.[part], translations[language]);
  assert.equal(typeof value, 'string', `missing ${language} translation: ${key}`);
  return Object.entries(variables).reduce(
    (result, [name, replacement]) =>
      result.replaceAll(`%{${name}}`, String(replacement)),
    value
  );
});

const show = {
  slug: 'opera-en-la-selva',
  title: 'Ópera en la Selva',
  artwork: '/img/podcasts/opera-en-la-selva/artwork.jpg',
  language: 'es'
};
const episode = {
  id: 'episode_fixture',
  publicationSchemaVersion: 1,
  pageMode: 'full_episode',
  showSlug: show.slug,
  slug: 'una-charla-sobre-codigo',
  title: 'Una charla sobre "código"',
  summary: 'Belleza, alegría y una línea\nnueva.',
  publicAt: '2026-07-23T15:00:00Z',
  audioUrl: 'https://media.dustwave.xyz/episodes/episode_fixture/audio',
  downloadUrl: 'https://media.dustwave.xyz/episodes/episode_fixture/audio?download=1',
  audioMimeType: 'audio/mpeg',
  chapterUrl:
    'https://feeds.dustwave.xyz/v1/shows/opera-en-la-selva/'
    + 'episodes/una-charla-sobre-codigo/chapters.json',
  transcriptUrl:
    'https://feeds.dustwave.xyz/v1/shows/opera-en-la-selva/'
    + 'episodes/una-charla-sobre-codigo/transcripts',
  subscribeUrl: '/podcasts/opera-en-la-selva/#podcast-membership',
  peaksUrl: null
};

const rendered = environment.renderString(body, {
  episode,
  i18n,
  language: 'es',
  metadata: { url: 'https://dustwave.xyz' },
  podcastApi: { apiOrigin: 'https://feeds.dustwave.xyz' },
  podcastShows: [show]
});

assert.match(rendered, /id="wave_opera-en-la-selva_una-charla-sobre-codigo"/);
assert.match(rendered, /<div class="audio-card" lang="es">/);
assert.match(rendered, /data-analytics-episode-id="episode_fixture"/);
assert.match(
  rendered,
  /data-analytics-endpoint="https:\/\/feeds\.dustwave\.xyz\/v1\/analytics\/player-events"/
);
assert.match(rendered, /aria-label="Reproducir Una charla sobre &quot;código&quot;"/);
assert.match(rendered, /href="https:\/\/media\.dustwave\.xyz\/episodes\/episode_fixture\/audio\?download=1"/);
assert.match(rendered, /href="\/es\/podcasts\/opera-en-la-selva\/"/);
assert.match(
  rendered,
  /data-endpoint="https:\/\/feeds\.dustwave\.xyz\/v1\/shows\/opera-en-la-selva\/episodes\/una-charla-sobre-codigo\/transcripts"/
);
assert.match(
  rendered,
  /data-player-id="opera-en-la-selva_una-charla-sobre-codigo"/
);
assert.match(rendered, />Transcripción</);
assert.match(rendered, />Capítulos</);
assert.doesNotMatch(rendered, /Transcripción \/ Transcript|Capítulos \/ Chapters/);
assert.match(
  rendered,
  /data-endpoint="https:\/\/feeds\.dustwave\.xyz\/v1\/shows\/opera-en-la-selva\/episodes\/una-charla-sobre-codigo\/chapters\.json"/
);
assert.match(rendered, /src="\/js\/podcast-chapters\.js\?v=dev" defer/);
assert.match(
  rendered,
  /data-endpoint="https:\/\/feeds\.dustwave\.xyz\/v1\/shows\/opera-en-la-selva\/episodes\/una-charla-sobre-codigo\/clips"/
);
assert.match(rendered, />Clips</);
assert.match(rendered, /src="\/js\/podcast-clips\.js\?v=dev" defer/);
assert.match(rendered, /src="\/js\/podcast-transcript\.js\?v=dev" defer/);

const structuredDataMatch = rendered.match(
  /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
);
assert(structuredDataMatch, 'episode template must contain PodcastEpisode structured data');
const structuredData = JSON.parse(structuredDataMatch[1]);
assert.equal(structuredData['@type'], 'PodcastEpisode');
assert.equal(structuredData.name, episode.title);
assert.equal(structuredData.description, episode.summary);
assert.equal(
  structuredData.url,
  'https://dustwave.xyz/news/podcasts/opera-en-la-selva/una-charla-sobre-codigo/'
);
assert.equal(structuredData.associatedMedia.contentUrl, episode.audioUrl);

const renderedEmbed = environment.renderString(embedBody, {
  episode,
  environment: 'production',
  i18n,
  metadata: { url: 'https://dustwave.xyz' },
  podcastApi: { apiOrigin: 'https://feeds.dustwave.xyz' },
  podcastShows: [show]
});

assert.match(
  embedSource,
  /permalink: "news\/podcasts\/\{\{ episode\.showSlug \}\}\/\{\{ episode\.slug \}\}\/embed\/index\.html"/
);
assert.match(embedSource, /eleventyExcludeFromCollections: true/);
assert.match(embedSource, /ignore: true/);
assert.match(renderedEmbed, /<html lang="es">/);
assert.match(renderedEmbed, /content="noindex,nofollow,noarchive"/);
assert.match(renderedEmbed, /http-equiv="Content-Security-Policy"/);
assert.match(renderedEmbed, /default-src 'none'/);
assert.match(renderedEmbed, /script-src 'self'/);
assert.match(renderedEmbed, /href="\/css\/podcast-embed\.min\.css\?v=dev"/);
assert.match(
  renderedEmbed,
  /<link rel="canonical" href="https:\/\/dustwave\.xyz\/news\/podcasts\/opera-en-la-selva\/una-charla-sobre-codigo\/">/
);
assert.match(
  renderedEmbed,
  /id="wave_embed_opera-en-la-selva_una-charla-sobre-codigo"/
);
assert.match(
  renderedEmbed,
  /href="https:\/\/media\.dustwave\.xyz\/episodes\/episode_fixture\/audio\?download=1"/
);
assert.match(renderedEmbed, /src="\/js\/audio-player\.js\?v=dev" defer/);
assert.match(
  renderedEmbed,
  /href="\/news\/podcasts\/opera-en-la-selva\/una-charla-sobre-codigo\/"/
);
assert.match(renderedEmbed, /Notas del episodio en Dust Wave/);
assert.doesNotMatch(renderedEmbed, /unpkg\.com|<script type="application\/ld\+json">/);

const renderedEnglishEmbed = environment.renderString(embedBody, {
  episode,
  environment: 'production',
  i18n,
  metadata: { url: 'https://dustwave.xyz' },
  podcastApi: { apiOrigin: 'https://feeds.dustwave.xyz' },
  podcastShows: [{ ...show, language: 'en' }]
});
assert.match(renderedEnglishEmbed, /<div class="audio-card" lang="en">/);
assert.match(renderedEnglishEmbed, /aria-label="Play Una charla/);
assert.match(renderedEnglishEmbed, /aria-label="Rewind 10 seconds"/);
assert.match(renderedEnglishEmbed, /Episode notes on Dust Wave/);

const premiumTeaser = {
  publicationSchemaVersion: 1,
  pageMode: 'premium_teaser',
  showSlug: show.slug,
  slug: 'episodio-extra',
  title: 'Extra <img src=x onerror=alert(1)>',
  summary: 'Una charla premium <script>alert(1)</script>.',
  publicAt: '2026-07-23T15:00:00Z',
  subscribeUrl: '/podcasts/opera-en-la-selva/#podcast-membership'
};
const renderedPremiumTeaser = environment.renderString(body, {
  episode: premiumTeaser,
  i18n,
  language: 'es',
  metadata: { url: 'https://dustwave.xyz' },
  podcastApi: { apiOrigin: 'https://feeds.dustwave.xyz' },
  podcastShows: [show]
});
assert.match(renderedPremiumTeaser, /Episodio premium\s*<\/p>/);
assert.match(renderedPremiumTeaser, />Solo para suscriptores</);
assert.match(
  renderedPremiumTeaser,
  /href="\/es\/podcasts\/opera-en-la-selva\/#podcast-membership"/
);
assert.match(renderedPremiumTeaser, /Extra &lt;img src=x onerror=alert\(1\)&gt;/);
assert.doesNotMatch(renderedPremiumTeaser, /<img src=x|<script>alert\(1\)/);
assert.doesNotMatch(
  renderedPremiumTeaser,
  /audio-card|data-audio|media\.dustwave|\/transcripts|\/chapters|\/clips|podcast-transcript\.js|podcast-chapters\.js|podcast-clips\.js/
);
const premiumStructuredDataMatch = renderedPremiumTeaser.match(
  /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/
);
assert(premiumStructuredDataMatch, 'premium teaser must contain structured data');
const premiumStructuredData = JSON.parse(premiumStructuredDataMatch[1]);
assert.equal(premiumStructuredData.isAccessibleForFree, false);
assert.equal(
  premiumStructuredData.offers.url,
  'https://dustwave.xyz/es/podcasts/opera-en-la-selva/#podcast-membership'
);
assert.equal('associatedMedia' in premiumStructuredData, false);

const renderedPremiumEmbed = environment.renderString(embedBody, {
  episode: premiumTeaser,
  environment: 'production',
  i18n,
  metadata: { url: 'https://dustwave.xyz' },
  podcastApi: { apiOrigin: 'https://feeds.dustwave.xyz' },
  podcastShows: [show]
});
assert.match(renderedPremiumEmbed, /Solo para suscriptores/);
assert.doesNotMatch(renderedPremiumEmbed, /Subscribers only/);
assert.match(
  renderedPremiumEmbed,
  /href="\/podcasts\/opera-en-la-selva\/#podcast-membership"/
);
assert.doesNotMatch(
  renderedPremiumEmbed,
  /audio-card|data-audio|media\.dustwave|audio-player\.js|<audio/
);

console.log(
  'Validated full and premium-teaser News, structured data, and portable embeds.'
);
