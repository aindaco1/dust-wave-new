import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const [playerScript, pageStyles] = await Promise.all([
  readFile(path.join(repositoryRoot, 'src/js/audio-player.js'), 'utf8'),
  readFile(path.join(repositoryRoot, 'src/scss/themes/base/_style-theme.scss'), 'utf8'),
]);

test('precomputed podcast peaks include a duration and retain a visible retry state', () => {
  assert.match(playerScript, /function getPrecomputedDuration\(payload\)/);
  assert.match(playerScript, /length \* samplesPerPixel \/ sampleRate/);
  assert.match(playerScript, /duration: precomputedDuration/);
  assert.match(
    playerScript,
    /else media\.removeAttribute\('crossorigin'\);[\s\S]*media\.preload = 'none'/
  );
  assert.match(
    playerScript,
    /if \(opts\.eager && !precomputedDuration\) media\.preload = 'metadata'/
  );
  assert.match(
    playerScript,
    /hint\.textContent = playerText\(card, 'retry', 'Retry'\)/
  );
  assert.match(
    playerScript,
    /waveEl\.classList\.add\("wave--fallback", "wave--error"\)/
  );
});

test('article headings use the full phone-width content column', () => {
  assert.match(
    pageStyles,
    /@media \(max-width: 540px\) \{\s*article h2 \{ width: 100%; \}\s*\}/
  );
});
