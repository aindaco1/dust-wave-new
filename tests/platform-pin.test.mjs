import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const PLATFORM_COMMIT = 'af2a5e5e4b65f218e627652b8243feb9704c48a1';
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

  assert.equal(checkout, PLATFORM_COMMIT);
  assert.match(gitmodules, new RegExp(`url = ${PLATFORM_REMOTE.replaceAll('.', '\\.')}`));
  assert.deepEqual(
    { name: adminShell.name, version: adminShell.version },
    { name: '@dustwave/admin-shell', version: '0.10.2' }
  );
  assert.deepEqual(
    { name: mediaCore.name, version: mediaCore.version },
    { name: '@dustwave/media-core', version: '0.4.0' }
  );
  assert.equal(
    rootManifest.dependencies?.['@dustwave/media-core'],
    'file:shared/dust-wave-platform/packages/media-core'
  );
  assert.deepEqual(lock.packages?.['shared/dust-wave-platform/packages/media-core'], {
    name: '@dustwave/media-core',
    version: '0.4.0',
    license: 'MIT',
    engines: { node: '>=20.9' }
  });
});
