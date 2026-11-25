import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PLATFORM_COMMIT = '2dc1b4348617b72202029ffe87e2a28b28fc7f79';
const PLATFORM_REMOTE = 'https://github.com/aindaco1/dust-wave-platform.git';

function readJson(path) {
  return JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
}

test('pins the reviewed Platform workspace and current site packages', () => {
  const checkout = execFileSync(
    'git',
    ['-C', 'shared/dust-wave-platform', 'rev-parse', 'HEAD'],
    { cwd: REPO_ROOT, encoding: 'utf8' }
  ).trim();
  const gitmodules = readFileSync(new URL('../.gitmodules', import.meta.url), 'utf8');
  const rootManifest = readJson('package.json');
  const lock = readJson('package-lock.json');
  const adminShell = readJson('shared/dust-wave-platform/packages/admin-shell/package.json');
  const mediaCore = readJson('shared/dust-wave-platform/packages/media-core/package.json');

  const communityLock = readJson('workers/community/package-lock.json');
  const workerCore = readJson('shared/dust-wave-platform/packages/worker-core/package.json');
  assert.equal(workerCore.version, '0.21.0');
  assert.equal(communityLock.packages['../../shared/dust-wave-platform/packages/worker-core'].version, workerCore.version);
  assert.equal(checkout, PLATFORM_COMMIT);
  assert.match(gitmodules, new RegExp(`url = ${PLATFORM_REMOTE.replaceAll('.', '\\.')}`));
  assert.deepEqual(
    { name: adminShell.name, version: adminShell.version },
    { name: '@dustwave/admin-shell', version: '0.20.2' }
  );
  assert.deepEqual(
    { name: mediaCore.name, version: mediaCore.version },
    { name: '@dustwave/media-core', version: '0.7.1' }
  );
  assert.equal(
    rootManifest.dependencies?.['@dustwave/media-core'],
    'file:shared/dust-wave-platform/packages/media-core'
  );
  assert.deepEqual(lock.packages?.['shared/dust-wave-platform/packages/media-core'], {
    name: '@dustwave/media-core',
    version: '0.7.1',
    license: 'MIT',
    engines: { node: '>=20.9' }
  });
});
