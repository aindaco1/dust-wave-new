import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const clipScript = await readFile(
  new URL('../src/js/podcast-clips.js', import.meta.url),
  'utf8'
);
const clipStyles = await readFile(
  new URL('../src/scss/themes/base/_podcast-clips.scss', import.meta.url),
  'utf8'
);
const themeStyles = await readFile(
  new URL('../src/scss/podcast-public.scss', import.meta.url),
  'utf8'
);
const template = await readFile(
  new URL('../src/news/podcasts/episode.njk', import.meta.url),
  'utf8'
);
const english = JSON.parse(await readFile(
  new URL('../src/_data/i18n/en.json', import.meta.url),
  'utf8'
));
const spanish = JSON.parse(await readFile(
  new URL('../src/_data/i18n/es.json', import.meta.url),
  'utf8'
));

assert.match(clipScript, /credentials: "omit"/);
assert.match(clipScript, /referrerPolicy: "no-referrer"/);
assert.match(clipScript, /raw\.length > 100_000/);
assert.match(clipScript, /value\.clips\.length > 24/);
assert.match(
  clipScript,
  /url\.hostname === "dust-wave-podcast-staging\.jogo\.workers\.dev"/
);
assert.match(clipScript, /url\.username[\s\S]+url\.password/);
assert.match(clipScript, /candidate\.mediaUrl !== expectedMedia\.href/);
assert.match(clipScript, /candidate\.downloadUrl !== expectedDownload\.href/);
assert.match(
  clipScript,
  /endpoint\.hostname === "feeds\.dustwave\.xyz"[\s\S]+https:\/\/media\.dustwave\.xyz/
);
assert.match(clipScript, /url\.origin !== "https:\/\/dustwave\.xyz"/);
assert.match(clipScript, /video\.preload = "none"/);
assert.match(clipScript, /video\.playsInline = true/);
assert.match(clipScript, /title\.textContent = clip\.title/);
assert.match(clipScript, /description\.textContent = clip\.description/);
assert.match(clipScript, /navigator\.share/);
assert.match(clipScript, /navigator\.clipboard\.writeText/);
assert.doesNotMatch(
  clipScript,
  /\.innerHTML|insertAdjacentHTML|eval\(|new Function/
);
assert.match(clipStyles, /aspect-ratio: var\(--podcast-clip-aspect/);
assert.match(clipStyles, /min-height: 44px/);
assert.match(clipStyles, /@media \(max-width: 540px\)/);
assert.match(
  clipStyles,
  /\.podcast-clips__copy-input,[\s\S]+\.podcast-clips__copy-status[\s\S]+flex-basis: auto/
);
assert.match(clipStyles, /flex-direction: column;[\s\S]+flex-wrap: nowrap/);
assert.match(clipStyles, /focus-visible/);
assert.match(themeStyles, /@import "themes\/base\/podcast-clips"/);
assert.match(template, /data-podcast-clips/);
assert.match(template, /podcastApi\.apiOrigin[\s\S]+\/clips/);
assert.match(template, /src="\/js\/podcast-clips\.js\?v=/);
assert.equal(english.podcast.episode.clips, 'Clips');
assert.equal(spanish.podcast.episode.clips, 'Clips');
assert.equal(english.runtime.clips.download, 'Download MP4');
assert.equal(spanish.runtime.clips.download, 'Descargar MP4');

console.log(
  'Validated safe, responsive bilingual public Podcast clip rendering.'
);
