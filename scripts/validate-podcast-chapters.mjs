import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const chapterScript = await readFile(
  new URL('../src/js/podcast-chapters.js', import.meta.url),
  'utf8'
);
const chapterStyles = await readFile(
  new URL('../src/scss/themes/base/_podcast-chapters.scss', import.meta.url),
  'utf8'
);
const themeStyles = await readFile(
  new URL('../src/scss/podcast-public.scss', import.meta.url),
  'utf8'
);
const audioPlayer = await readFile(
  new URL('../src/js/audio-player.js', import.meta.url),
  'utf8'
);

assert.match(chapterScript, /credentials: "omit"/);
assert.match(chapterScript, /referrerPolicy: "no-referrer"/);
assert.match(chapterScript, /raw\.length > 300_000/);
assert.match(
  chapterScript,
  /url\.origin !== "https:\/\/feeds\.dustwave\.xyz"/
);
assert.match(chapterScript, /url\.username \|\| url\.password/);
assert.match(chapterScript, /value\.chapters\.length > 500/);
assert.match(chapterScript, /title\.textContent = chapter\.title/);
assert.match(
  chapterScript,
  /window\.DWDigestAudio\?\.seekTo\([\s\S]*\{[\s\S]*play: true/
);
assert.match(chapterScript, /DWDigestAudio\.subscribeTime/);
assert.match(chapterScript, /setAttribute\("aria-current", "true"\)/);
assert.match(chapterScript, /rel = "noopener noreferrer"/);
assert.doesNotMatch(
  chapterScript,
  /\.innerHTML|insertAdjacentHTML|eval\(|new Function/
);
assert.match(audioPlayer, /subscribeTime\(playerId, listener\)/);
assert.match(chapterStyles, /min-height: 3\.25rem/);
assert.match(chapterStyles, /@media \(max-width: 560px\)/);
assert.match(chapterStyles, /focus-visible/);
assert.match(themeStyles, /@import "themes\/base\/podcast-chapters"/);

console.log(
  'Validated safe, accessible Podcasting 2.0 chapter rendering.'
);
