import {
  shareCardSvgMarkup
} from '../shared/dust-wave-platform/packages/admin-shell/src/marketing-assets.js';
import sharp from 'sharp';

export const PODCAST_SOCIAL_CARD_WIDTH = 1200;
export const PODCAST_SOCIAL_CARD_HEIGHT = 630;

export function buildPodcastSocialCardSvg({
  show,
  episode,
  artworkDataUrl
}) {
  if (!show || show.slug !== episode?.showSlug) {
    throw new TypeError('Episode and show do not match');
  }
  const language = show.language === 'en' ? 'en' : 'es';
  return shareCardSvgMarkup({
    brand: language === 'es'
      ? 'DUST WAVE · NUEVO EPISODIO'
      : 'DUST WAVE · NEW EPISODE',
    eyebrow: boundedText(show.title, 64),
    title: boundedText(episode.title, 160),
    summary: boundedText(episode.summary, 320, true),
    footer: 'dustwave.xyz',
    artworkDataUrl,
    accent: '#ffd54d',
    language
  });
}

export async function renderPodcastSocialCardPng(svg) {
  const source = String(svg || '');
  if (!source.startsWith('<?xml') || source.length > 4_500_000) {
    throw new TypeError('Podcast social-card SVG is invalid or oversized');
  }
  return sharp(Buffer.from(source))
    .png({
      palette: true,
      quality: 90,
      effort: 6,
      compressionLevel: 9,
      adaptiveFiltering: true
    })
    .toBuffer();
}

function boundedText(value, maximum, optional = false) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text && !optional) throw new TypeError('Required social-card text is missing');
  return Array.from(text).slice(0, maximum).join('');
}
