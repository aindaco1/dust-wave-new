import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import nunjucks from 'nunjucks';

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
const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(includePath),
  { autoescape: true, throwOnUndefined: true }
);

environment.addFilter('podcastShowBySlug', (shows, showSlug) => {
  return shows.find((show) => show.slug === showSlug) ?? null;
});
environment.addFilter('readablePodcastDate', () => 'July 23, 2026');

const show = {
  slug: 'opera-en-la-selva',
  title: 'Ópera en la Selva',
  artwork: '/img/podcasts/opera-en-la-selva/artwork.jpg',
  language: 'es'
};
const episode = {
  showSlug: show.slug,
  slug: 'una-charla-sobre-codigo',
  title: 'Una charla sobre "código"',
  summary: 'Belleza, alegría y una línea\nnueva.',
  publicAt: '2026-07-23T15:00:00Z',
  audioUrl: 'https://media.dustwave.xyz/episodes/episode_fixture/audio',
  downloadUrl: 'https://media.dustwave.xyz/episodes/episode_fixture/audio?download=1',
  audioMimeType: 'audio/mpeg',
  peaksUrl: null
};

const rendered = environment.renderString(body, {
  episode,
  metadata: { url: 'https://dustwave.xyz' },
  podcastShows: [show]
});

assert.match(rendered, /id="wave_opera-en-la-selva_una-charla-sobre-codigo"/);
assert.match(rendered, /<div class="audio-card" lang="es">/);
assert.match(rendered, /aria-label="Reproducir Una charla sobre &quot;código&quot;"/);
assert.match(rendered, /href="https:\/\/media\.dustwave\.xyz\/episodes\/episode_fixture\/audio\?download=1"/);
assert.match(rendered, /href="\/podcasts\/opera-en-la-selva\/"/);

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
  metadata: { url: 'https://dustwave.xyz' },
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
assert.match(renderedEmbed, /href="\/css\/podcast-embed\.min\.css"/);
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
assert.match(renderedEmbed, /src="\/js\/audio-player\.js" defer/);
assert.match(
  renderedEmbed,
  /href="\/news\/podcasts\/opera-en-la-selva\/una-charla-sobre-codigo\/"/
);
assert.match(renderedEmbed, /Notas del episodio en Dust Wave/);
assert.doesNotMatch(renderedEmbed, /unpkg\.com|<script type="application\/ld\+json">/);

const renderedEnglishEmbed = environment.renderString(embedBody, {
  episode,
  environment: 'production',
  metadata: { url: 'https://dustwave.xyz' },
  podcastShows: [{ ...show, language: 'en' }]
});
assert.match(renderedEnglishEmbed, /<div class="audio-card" lang="en">/);
assert.match(renderedEnglishEmbed, /aria-label="Play Una charla/);
assert.match(renderedEnglishEmbed, /aria-label="Rewind 10 seconds"/);
assert.match(renderedEnglishEmbed, /Episode notes on Dust Wave/);

console.log(
  'Validated canonical podcast News rendering, structured data, and portable embed rendering.'
);
