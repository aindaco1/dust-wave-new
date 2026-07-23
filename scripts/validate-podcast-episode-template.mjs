import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import nunjucks from 'nunjucks';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const templatePath = path.join(repositoryRoot, 'src/news/podcasts/episode.njk');
const includePath = path.join(repositoryRoot, 'src/_includes');
const source = await readFile(templatePath, 'utf8');
const body = source.replace(/^---\n[\s\S]*?\n---\n/, '');
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
  artwork: '/img/podcasts/opera-en-la-selva/artwork.jpg'
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

console.log('Validated canonical podcast News page rendering and structured data.');
