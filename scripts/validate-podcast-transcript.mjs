import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const transcriptScript = await readFile(
  new URL('../src/js/podcast-transcript.js', import.meta.url),
  'utf8'
);
const transcriptStyles = await readFile(
  new URL('../src/scss/themes/base/_podcast-transcript.scss', import.meta.url),
  'utf8'
);
const themeStyles = await readFile(
  new URL('../src/scss/podcast-public.scss', import.meta.url),
  'utf8'
);
const gulpfile = await readFile(
  new URL('../gulpfile.js', import.meta.url),
  'utf8'
);

assert.match(transcriptScript, /credentials: "omit"/);
assert.match(transcriptScript, /referrerPolicy: "no-referrer"/);
assert.match(transcriptScript, /raw\.length > 2_200_000/);
assert.match(transcriptScript, /url\.hostname === "feeds\.dustwave\.xyz"/);
assert.match(transcriptScript, /transcript\.cues\.length > 10_000/);
assert.match(transcriptScript, /document\.createTextNode\(cue\.text\)/);
assert.match(
  transcriptScript,
  /window\.DWDigestAudio\?\.seekTo\([\s\S]*\{ play: true \}/
);
assert.match(transcriptScript, /setAttribute\("role", "tablist"\)/);
assert.match(transcriptScript, /event\.key === "ArrowRight"/);
assert.match(transcriptScript, /candidate\.tabIndex = selected \? 0 : -1/);
assert.doesNotMatch(
  transcriptScript,
  /\.innerHTML|insertAdjacentHTML|eval\(|new Function/
);
assert.match(transcriptStyles, /min-height: 44px/);
assert.match(transcriptStyles, /@media \(max-width: 540px\)/);
assert.match(transcriptStyles, /focus-visible/);
assert.match(themeStyles, /@import "themes\/base\/podcast-transcript"/);
assert.match(
  gulpfile,
  /`\$\{DIR\.src\}\/news\/podcasts\/\*\*\/\*\.njk`/
);

console.log(
  'Validated safe, accessible bilingual Podcast transcript rendering.'
);
