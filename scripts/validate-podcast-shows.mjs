import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const showsPath = path.join(repositoryRoot, 'src/_data/podcastShows.json');
const shows = JSON.parse(await readFile(showsPath, 'utf8'));

assert(Array.isArray(shows) && shows.length > 0, 'podcastShows.json must contain at least one show');

const ids = new Set();
const slugs = new Set();
for (const show of shows) {
  assert.match(show.id, /^show_[a-z0-9_]+$/, `invalid show id: ${show.id}`);
  assert.match(show.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `invalid show slug: ${show.slug}`);
  assert(!ids.has(show.id), `duplicate show id: ${show.id}`);
  assert(!slugs.has(show.slug), `duplicate show slug: ${show.slug}`);
  ids.add(show.id);
  slugs.add(show.slug);

  assert.equal(typeof show.title, 'string');
  assert(show.title.trim().length > 0, `${show.slug} needs a title`);
  assert.equal(typeof show.description, 'string');
  assert(show.description.trim().length > 0, `${show.slug} needs a primary description`);
  assert.equal(typeof show.descriptionEn, 'string');
  assert(show.descriptionEn.trim().length > 0, `${show.slug} needs an English description`);
  assert(['en', 'es'].includes(show.language), `${show.slug} must use a launch language`);
  assert(Array.isArray(show.episodes), `${show.slug} episodes must be an array`);
  assert.equal(show.publicAccess.priceCents, 0, `${show.slug} public access must remain free`);
  assert.equal(
    show.feedUrl,
    `https://feeds.dustwave.xyz/${show.slug}/rss.xml`,
    `${show.slug} must use the reserved permanent feed hostname`
  );
  assert.equal(show.feedStatus, 'reserved', `${show.slug} feed must remain reserved until launch`);
  assert.equal(
    show.mediaOrigin,
    'https://media.dustwave.xyz',
    `${show.slug} must use the reserved permanent media hostname`
  );
  assert(
    ['days_before_public', 'date_driven'].includes(show.earlyAccess.mode),
    `${show.slug} early access mode is invalid`
  );
  if (show.earlyAccess.mode === 'days_before_public') {
    assert(
      Number.isInteger(show.earlyAccess.days) && show.earlyAccess.days >= 0,
      `${show.slug} early access days must be a non-negative integer`
    );
  }
  assert.equal(
    typeof show.earlyAccess.allowEpisodeOverride,
    'boolean',
    `${show.slug} must declare whether episodes may override early access`
  );
  assert.equal(
    typeof show.freeMiniEpisode.enabled,
    'boolean',
    `${show.slug} must declare whether a free mini episode is enabled`
  );
  assert(
    Number.isInteger(show.freeMiniEpisode.maximumPerShow)
      && show.freeMiniEpisode.maximumPerShow >= 0
      && show.freeMiniEpisode.maximumPerShow <= 1,
    `${show.slug} may allow at most one free mini episode`
  );

  for (const episode of show.episodes) {
    assert.match(
      episode.slug,
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${show.slug}: each episode requires a URL-safe slug`
    );
    assert(
      typeof episode.title === 'string' && episode.title.trim(),
      `${show.slug}: each episode requires a title`
    );
    assert(
      typeof episode.url === 'string' && episode.url.startsWith('/'),
      `${show.slug}/${episode.slug}: the canonical News URL must be site-relative`
    );
    assert(
      typeof episode.audioUrl === 'string' && /^https:\/\//.test(episode.audioUrl),
      `${show.slug}/${episode.slug}: audioUrl must use HTTPS`
    );
    if (episode.peaksUrl) {
      assert(
        typeof episode.peaksUrl === 'string' && episode.peaksUrl.startsWith('/peaks/'),
        `${show.slug}/${episode.slug}: peaksUrl must use the existing /peaks/ player contract`
      );
    }
  }

  if (show.premium?.enabled) {
    assert.equal(show.premium.currency, 'USD', `${show.slug} premium currency must be USD`);
    assert(Number.isSafeInteger(show.premium.monthlyCents) && show.premium.monthlyCents > 0);
    assert(Number.isSafeInteger(show.premium.annualCents) && show.premium.annualCents > 0);
    assert(show.premium.annualCents < show.premium.monthlyCents * 12, `${show.slug} annual price needs a discount`);
    assert.deepEqual(
      show.premium.benefits,
      ['Episodios extra', 'Acceso anticipado'],
      `${show.slug} launch benefits changed without a product decision`
    );
  }

  for (const asset of [show.artwork, show.wordmark, show.socialImage]) {
    assert(asset.startsWith('/img/'), `${show.slug} asset must be site-local: ${asset}`);
    await access(path.join(repositoryRoot, 'src', asset.replace(/^\//, '')));
  }
}

const launchShow = shows.find((show) => show.slug === 'opera-en-la-selva');
assert(launchShow, 'Ópera en la Selva must remain configured for launch');
assert.equal(
  launchShow.description,
  'Belleza y alegría. Y un poco de tecnología de vez en cuando.',
  'Ópera en la Selva Spanish description changed without an editorial decision'
);
assert.equal(
  launchShow.descriptionEn,
  'Beauty and joy. And a bit of tech from time to time.',
  'Ópera en la Selva English description changed without an editorial decision'
);
assert.deepEqual(
  launchShow.earlyAccess,
  { mode: 'days_before_public', days: 7, allowEpisodeOverride: true },
  'Ópera en la Selva must default to seven-day early access with episode overrides'
);
assert.deepEqual(
  launchShow.freeMiniEpisode,
  { enabled: true, maximumPerShow: 1 },
  'Ópera en la Selva must allow exactly one free mini episode'
);

console.log(`Validated ${shows.length} podcast show configuration(s).`);
