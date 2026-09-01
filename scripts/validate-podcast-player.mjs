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
const digestStyles = await readFile(
  path.join(repositoryRoot, 'src/scss/themes/base/_digest.scss'),
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
assert.match(playerScript, /card\?\.dataset\?\.\[datasetKey\]/);
assert.match(playerScript, /window\.DustWaveI18n\?\.t\(`player\.\$\{key\}`/);
assert.doesNotMatch(playerScript, /playerLanguage\.toLowerCase\(\)\.startsWith\('es'\)/);
assert.match(playerScript, /seekTo\(playerId, seconds/);
assert.match(playerScript, /async mount\(scope = document\)/);
assert.match(playerScript, /card\.dataset\.audioCredentials === "include"/);
assert.match(
  playerScript,
  /credentials: card\.dataset\.audioCredentials === "include"[\s\S]*\? "include"[\s\S]*: "same-origin"/
);
assert.match(playerScript, /dataset\.analyticsEndpoint/);
assert.match(playerScript, /event: "engaged_play"/);
assert.match(playerScript, /event: "web_player_completion"/);
assert.match(playerScript, /const completionMilestones = \[25, 50, 75, 100\]/);
assert.match(playerScript, /elapsed < 60/);
assert.match(playerScript, /document\.visibilityState === "visible"/);
assert.match(playerScript, /credentials: "omit"/);
assert.match(playerScript, /const svgBack = `<svg/);
assert.match(playerScript, /const svgForward = `<svg/);
assert.match(playerScript, /const svgDownload = `<svg/);
assert.match(playerScript, /function playerText\(card, key, fallback, variables/);
assert.match(playerScript, /playerText\(card, 'pause', 'Pause'\)/);
assert.match(playerScript, /playerText\(\s*card,\s*'playbackSpeed'/);
assert.match(playerScript, /document\.getElementById\(`wave_\$\{playerId\}`\)/);
assert.doesNotMatch(playerScript, /unpkg\.com|cdn\.jsdelivr\.net/);
assert.match(
  footer,
  /\{% if content and '<div class="audio-card' in content %\}\s*<script src="\/js\/audio-player\.js\?v=\{\{ assets\.version \| default\('dev'\) \}\}" defer><\/script>\s*\{% endif %\}/
);
assert.doesNotMatch(footer, /wavesurfer\.js|WAVESURFER_/i);
assert.match(themeStyles, /@import "themes\/base\/audio-player"/);
assert.match(embedStyles, /@import "themes\/base\/audio-player"/);
assert.match(playerStyles, /\.audio-card/);
assert.match(playerStyles, /@media \(max-width: 540px\)/);
assert.match(playerStyles, /@media \(max-width: 360px\)/);
assert.match(playerStyles, /flex-wrap: wrap/);
const compactMobileStyles = playerStyles.match(
  /@media \(max-width: 540px\)\{([\s\S]*?)\n\}\n@media \(max-width: 360px\)/
)?.[1];
assert.ok(compactMobileStyles, 'Expected the compact mobile player styles');
assert.match(
  playerStyles,
  /@mixin audio-card-grid-layout\([\s\S]*display: grid;[\s\S]*height: auto;[\s\S]*grid-column: 1 \/ -1;/
);
assert.match(
  compactMobileStyles,
  /@include audio-card-grid-layout\(var\(--art-w\), var\(--art-h\), 8px\)/
);
assert.match(compactMobileStyles, /--art-w: clamp\(88px, 28vw, 136px\)/);
const narrowMobileStyles = playerStyles.match(
  /@media \(max-width: 360px\)\{([\s\S]*?)\n\}\n\n\/\* Tooltip/
)?.[1];
assert.ok(narrowMobileStyles, 'Expected the narrow mobile player styles');
assert.doesNotMatch(narrowMobileStyles, /--audio-h:/);
assert.doesNotMatch(
  playerStyles,
  /@media \(min-width: 421px\) and \(max-width: 540px\)/
);
assert.match(
  playerStyles,
  /button:not\(\[data-audio-speed\]\)\{ width:44px; height:44px;/
);
assert.match(playerStyles, /:focus-visible/);
assert.match(digestStyles, /@media \(min-width: 992px\)/);
assert.match(
  digestStyles,
  /#av-grid \.audio-card[\s\S]*@include audio-card-grid-layout\([\s\S]*var\(--digest-player-art\)/
);
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
