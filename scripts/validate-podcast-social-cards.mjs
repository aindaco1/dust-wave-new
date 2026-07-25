import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import {
  buildPodcastSocialCardSvg,
  PODCAST_SOCIAL_CARD_HEIGHT,
  PODCAST_SOCIAL_CARD_WIDTH,
  renderPodcastSocialCardPng
} from './podcast-social-card.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const artwork = await readFile(
  path.join(
    repositoryRoot,
    'src/img/podcasts/opera-en-la-selva/artwork.png'
  )
);
const svg = buildPodcastSocialCardSvg({
  show: {
    slug: 'opera-en-la-selva',
    title: 'Ópera en la Selva',
    language: 'es'
  },
  episode: {
    showSlug: 'opera-en-la-selva',
    title: 'Una charla sobre <código> & "arte"',
    summary: 'Belleza, alegría y una línea nueva.'
  },
  artworkDataUrl: `data:image/png;base64,${artwork.toString('base64')}`
});

assert.match(svg, /DUST WAVE · NUEVO EPISODIO/);
assert.match(svg, /ÓPERA EN LA SELVA/);
assert.match(svg, /&lt;CÓDIGO&gt; &amp;/);
assert.doesNotMatch(svg, /<script|<código>/i);
const png = await renderPodcastSocialCardPng(svg);
const metadata = await sharp(png).metadata();
assert.equal(metadata.format, 'png');
assert.equal(metadata.width, PODCAST_SOCIAL_CARD_WIDTH);
assert.equal(metadata.height, PODCAST_SOCIAL_CARD_HEIGHT);
assert(png.byteLength > 10_000 && png.byteLength < 5_000_000);

assert.throws(
  () => buildPodcastSocialCardSvg({
    show: { slug: 'show-a', title: 'A', language: 'en' },
    episode: { showSlug: 'show-b', title: 'B', summary: '' },
    artworkDataUrl: ''
  }),
  /do not match/
);
await assert.rejects(
  () => renderPodcastSocialCardPng('<svg></svg>'),
  /invalid or oversized/
);

console.log(
  `Validated the ${metadata.width}×${metadata.height} Podcast social-card PNG contract.`
);
