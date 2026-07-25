import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const playerScript = await readFile(
  path.join(repositoryRoot, 'src/js/audio-player.js'),
  'utf8'
);
const playerStyles = await readFile(
  path.join(repositoryRoot, 'src/scss/themes/base/_audio-player.scss'),
  'utf8'
);
const embedStyles = await readFile(
  path.join(repositoryRoot, 'src/scss/podcast-embed.scss'),
  'utf8'
);
const themeStyles = await readFile(
  path.join(repositoryRoot, 'src/scss/theme.scss'),
  'utf8'
);
const footer = await readFile(
  path.join(repositoryRoot, 'src/_includes/snippets/footer1.njk'),
  'utf8'
);
const gulpfile = await readFile(path.join(repositoryRoot, 'gulpfile.js'), 'utf8');
const packageJson = JSON.parse(
  await readFile(path.join(repositoryRoot, 'package.json'), 'utf8')
);
const thirdPartyNotices = await readFile(
  path.join(repositoryRoot, 'THIRD_PARTY_NOTICES.md'),
  'utf8'
);

assert.match(playerScript, /const WAVESURFER_PATH = "\/js\/vendor\/wavesurfer\.min\.js"/);
assert.match(playerScript, /let wavesurferLoadPromise/);
assert.match(
  playerScript,
  /const cards = Array\.from\(document\.querySelectorAll\("\.audio-card"\)\);\s+if \(!cards\.length\) return;\s+\s*try \{ await ensureWavesurferLoaded\(\);/
);
assert.match(playerScript, /playerLanguage\.toLowerCase\(\)\.startsWith\('es'\)/);
assert.doesNotMatch(playerScript, /unpkg\.com|cdn\.jsdelivr\.net/);
assert.match(
  footer,
  /\{% if content and '<div class="audio-card' in content %\}\s*<script src="\/js\/audio-player\.js" defer><\/script>\s*\{% endif %\}/
);
assert.doesNotMatch(footer, /wavesurfer\.js|WAVESURFER_/i);
assert.match(themeStyles, /@import "themes\/base\/audio-player"/);
assert.match(embedStyles, /@import "themes\/base\/audio-player"/);
assert.match(playerStyles, /\.audio-card/);
assert.match(playerStyles, /@media \(max-width: 420px\)/);
assert.match(gulpfile, /function copyAudioPlayerVendor/);
assert.match(gulpfile, /wavesurfer\.js\/dist\/wavesurfer\.min\.js/);
assert.match(gulpfile, /function copyThirdPartyNotices/);
assert.equal(packageJson.dependencies['wavesurfer.js'], '7.12.11');
assert.match(thirdPartyNotices, /wavesurfer\.js 7\.12\.11/);
assert.match(thirdPartyNotices, /BSD 3-Clause License/);
await access(
  path.join(repositoryRoot, 'node_modules/wavesurfer.js/dist/wavesurfer.min.js')
);

console.log(
  'Validated the shared, self-hosted, lazy Podcast/Digest player asset contract.'
);
