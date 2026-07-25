import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const adminTemplate = await readFile(
  path.join(repositoryRoot, 'src/admin/podcasts/index.njk'),
  'utf8'
);
const adminLayout = await readFile(
  path.join(repositoryRoot, 'src/_includes/layouts/podcast-admin.njk'),
  'utf8'
);
const adminScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin.js'),
  'utf8'
);
const adminConfig = await readFile(
  path.join(repositoryRoot, 'src/_data/podcastAdmin.js'),
  'utf8'
);
const gulpfile = await readFile(path.join(repositoryRoot, 'gulpfile.js'), 'utf8');
const sharedRoot = path.join(
  repositoryRoot,
  'shared/dust-wave-platform/packages/admin-shell'
);
const sharedPackage = JSON.parse(
  await readFile(path.join(sharedRoot, 'package.json'), 'utf8')
);

assert.match(adminTemplate, /permalink: admin\/podcasts\/index\.html/);
assert.match(adminLayout, /noindex,nofollow,noarchive/);
assert.match(adminLayout, /type="module" src="\/js\/podcast-admin\.js"/);
assert.match(adminConfig, /https:\/\/feeds\.dustwave\.xyz/);
assert.doesNotMatch(adminConfig, /workers\.dev/);
assert.match(adminTemplate, /data-podcast-auth/);
assert.match(adminTemplate, /data-podcast-episode-form/);
assert.match(adminTemplate, /data-podcast-upload-form/);
assert.match(adminTemplate, /data-podcast-ad-plan-form/);
assert.match(adminTemplate, /data-podcast-ad-plan-result/);
assert.match(adminTemplate, /data-podcast-distribution/);
assert.match(adminTemplate, /data-tab="production"/);
assert.match(adminTemplate, /data-podcast-transcript-workbench/);
assert.match(adminTemplate, /data-podcast-transcript-cues/);
assert.match(adminTemplate, /data-podcast-transcript-pages/);
assert.match(adminTemplate, /Word timing gated/);
assert.match(adminTemplate, /data-podcast-clip-form/);
assert.match(adminTemplate, /data-podcast-clip-preview/);
assert.match(adminTemplate, /data-podcast-clip-list/);
assert.match(adminTemplate, /Word-accurate cuts stay locked/);
assert.match(adminTemplate, /authenticated preview and download/);
assert.match(adminTemplate, /Private evidence only/);
assert.match(adminTemplate, /data-tab="marketing"/);
assert.match(adminTemplate, /data-tab="sponsors"/);
assert.match(adminTemplate, /data-tab="analytics"/);
assert.match(adminTemplate, /data-podcast-reconciliation/);
assert.match(adminTemplate, /Qualified sponsor deliveries/);
assert.match(adminTemplate, /data-podcast-sponsor-preview-form/);
assert.match(adminTemplate, /data-podcast-campaign-form/);
assert.match(adminTemplate, /data-podcast-campaign-list/);
assert.match(adminTemplate, /data-podcast-creative-form/);
assert.match(adminTemplate, /accept="\.mp3,audio\/mpeg"/);
assert.match(adminScript, /x-podcast-csrf/);
assert.match(adminScript, /idempotent/);
assert.match(adminScript, /recommendedPartBytes/);
assert.match(adminScript, /\/ad-plan/);
assert.match(adminScript, /data-approve-ad-plan/);
assert.match(adminScript, /runtime ads remain disabled/i);
assert.match(adminScript, /\/v1\/admin\/ads\/preview/);
assert.match(adminScript, /\/v1\/admin\/ads\/campaigns/);
assert.match(adminScript, /data-kill-campaign/);
assert.match(adminScript, /created\.upload\.lengthHeader/);
assert.match(adminScript, /\/v1\/admin\/ads\/creatives/);
assert.match(adminScript, /validated\.validationStatus !== "ready"/);
assert.match(adminScript, /payload\.previewOnly/);
assert.match(adminScript, /\/v1\/admin\/ads\/reconciliation/);
assert.match(adminScript, /trusted sponsor-delivery evidence/i);
assert.match(adminScript, /mode: "timed_text"/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/transcripts/
);
assert.match(adminScript, /baseRevision: Number\(transcript\.revision/);
assert.match(adminScript, /expectedRevision: Number\(transcript\.revision\)/);
assert.match(adminScript, /speakerConfirmed/);
assert.match(adminScript, /wordControlsEnabled/);
assert.match(adminScript, /TRANSCRIPT_CUES_PER_PAGE = 100/);
assert.match(adminScript, /syncVisibleTranscriptCues/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/clips/
);
assert.match(
  adminScript,
  /\/v1\/admin\/clips\/\$\{encodeURIComponent\(clip\.id\)\}\/render/
);
assert.match(adminScript, /baseRevision: Number\(selected\?\.revision/);
assert.match(adminScript, /startCueId: clipForm\.elements\.startCueId\.value/);
assert.match(adminScript, /endCueId: clipForm\.elements\.endCueId\.value/);
assert.match(adminScript, /boundaryMode: "segment"/);
assert.match(adminScript, /captioned-waveform-v1/);
assert.match(adminScript, /downloadJson/);
assert.match(adminScript, /This is not a completed render/);
assert.match(adminScript, /data-podcast-clip-render-preview/);
assert.match(adminScript, /crossOrigin = "use-credentials"/);
assert.match(adminScript, /render\.downloadPath/);
assert.match(adminScript, /releaseClipMediaPlayers/);
assert.match(adminScript, /clip-renders/);
assert.doesNotMatch(adminScript, /startsAtMs:\s*clipForm/);
assert.doesNotMatch(adminScript, /endsAtMs:\s*clipForm/);
assert.doesNotMatch(adminScript, /(?:localStorage|sessionStorage).*(?:clip|caption)/i);
assert.doesNotMatch(
  adminScript,
  /(?:localStorage|sessionStorage)\.(?:setItem|getItem)\([^)]*transcript/i
);
assert.match(gulpfile, /copySharedAdminShell/);
assert.equal(sharedPackage.name, '@dustwave/admin-shell');
assert.equal(sharedPackage.version, '0.1.0');

const sharedSources = [
  'api-client.js',
  'editor.js',
  'editor-codec.js',
  'passwordless-session.js',
  'tabs.js'
];
for (const source of sharedSources) {
  await access(path.join(sharedRoot, 'src', source));
}
for (const source of sharedSources.filter((source) => source !== 'editor-codec.js')) {
  assert.match(
    adminScript,
    new RegExp(`dust-wave-admin-shell/${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  );
}

console.log('Validated the shared, fail-closed Podcast admin shell contract.');
