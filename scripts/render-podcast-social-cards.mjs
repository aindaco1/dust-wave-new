#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildPodcastSocialCardSvg,
  renderPodcastSocialCardPng
} from './podcast-social-card.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const sourceRoot = path.join(repositoryRoot, 'src');
const publications = JSON.parse(
  await readFile(
    path.join(sourceRoot, '_data/podcastEpisodePublications.json'),
    'utf8'
  )
);
const shows = JSON.parse(
  await readFile(path.join(sourceRoot, '_data/podcastShows.json'), 'utf8')
);
const outputRoots = process.argv.includes('--dev-only')
  ? [path.join(repositoryRoot, 'dev')]
  : [path.join(repositoryRoot, 'dev'), path.join(repositoryRoot, 'docs')];

if (!Array.isArray(publications) || publications.length > 500) {
  throw new Error('Podcast publication data must contain at most 500 episodes');
}

let generated = 0;
for (const episode of publications) {
  const show = shows.find(({ slug }) => slug === episode.showSlug);
  if (!show) throw new Error(`Unknown podcast show: ${episode.showSlug}`);
  assertSlug(show.slug, 'show slug');
  assertSlug(episode.slug, 'episode slug');
  const artworkDataUrl = await localArtworkDataUrl(show.artwork);
  const svg = buildPodcastSocialCardSvg({ show, episode, artworkDataUrl });
  const png = await renderPodcastSocialCardPng(svg);
  if (png.byteLength > 5_000_000) {
    throw new Error(`Podcast social card is too large: ${show.slug}/${episode.slug}`);
  }
  for (const outputRoot of outputRoots) {
    const outputDirectory = path.join(
      outputRoot,
      'img',
      'podcasts',
      show.slug,
      episode.slug
    );
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, 'social-card.png'), png);
  }
  generated += 1;
}

console.log(`Generated ${generated} podcast social card(s).`);

async function localArtworkDataUrl(sourcePath) {
  if (typeof sourcePath !== 'string' || !sourcePath.startsWith('/img/')) {
    throw new Error('Podcast artwork must use a site-local /img/ path');
  }
  const resolved = path.resolve(sourceRoot, `.${sourcePath}`);
  if (!resolved.startsWith(`${path.resolve(sourceRoot)}${path.sep}`)) {
    throw new Error('Podcast artwork path escapes the source directory');
  }
  const extension = path.extname(resolved).toLowerCase();
  const mime = extension === '.png'
    ? 'image/png'
    : ['.jpg', '.jpeg'].includes(extension)
      ? 'image/jpeg'
      : extension === '.webp'
        ? 'image/webp'
        : null;
  if (!mime) throw new Error('Podcast artwork must be PNG, JPEG, or WebP');
  const bytes = await readFile(resolved);
  if (bytes.byteLength > 3_000_000) {
    throw new Error('Podcast artwork exceeds the 3 MB build limit');
  }
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function assertSlug(value, label) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ''))) {
    throw new Error(`Invalid ${label}`);
  }
}
