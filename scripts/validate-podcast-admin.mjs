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
const adminStyles = await readFile(
  path.join(repositoryRoot, 'src/scss/themes/base/_podcast-admin.scss'),
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
assert.match(adminLayout, /src="\/js\/audio-player\.js" defer/);
assert.match(adminConfig, /https:\/\/feeds\.dustwave\.xyz/);
assert.doesNotMatch(adminConfig, /workers\.dev/);
assert.match(adminTemplate, /data-podcast-auth/);
assert.match(adminTemplate, /data-podcast-episode-form/);
assert.match(adminTemplate, /data-podcast-upload-form/);
assert.match(adminTemplate, /data-podcast-ad-plan-form/);
assert.match(adminTemplate, /data-podcast-ad-plan-result/);
assert.match(adminTemplate, /data-podcast-distribution/);
assert.match(adminTemplate, /With just one click, we send your episodes live to 10\+ platforms/);
assert.match(adminTemplate, /Each platform still requires one-time owner setup/);
assert.match(adminTemplate, /lang="es"/);
assert.match(adminTemplate, /data-podcast-distribution-filter/);
assert.match(adminTemplate, /exact RSS, News, YouTube, and per-directory states/);
assert.match(adminTemplate, /data-tab="production"/);
assert.match(adminTemplate, /data-podcast-audio-qc/);
assert.match(adminTemplate, /data-podcast-audio-qc-queue/);
assert.match(adminTemplate, /data-podcast-audio-qc-policy-form/);
assert.match(adminTemplate, /Admin and Super-admin changes apply only to future QC runs/);
assert.match(adminTemplate, /Measure the immutable source/);
assert.match(adminTemplate, /never overwrites audio or publishes an episode/);
assert.match(adminTemplate, /data-podcast-audio-master/);
assert.match(adminTemplate, /data-podcast-audio-master-approval/);
assert.match(adminTemplate, /data-podcast-audio-enhancement-form/);
assert.match(adminTemplate, /data-podcast-audio-enhancement-results/);
assert.match(adminTemplate, /An enhancement preview is never a master/);
assert.match(adminTemplate, /Replacing an approved master makes transcript, chapter, clip, and readiness approvals stale/);
assert.match(adminTemplate, /data-podcast-transcript-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-queue/);
assert.match(adminTemplate, /Source-language transcription/);
assert.match(adminTemplate, /name="sourceLanguage"/);
assert.match(adminTemplate, /data-podcast-transcript-cues/);
assert.match(adminTemplate, /data-podcast-transcript-pages/);
assert.match(adminTemplate, /Word timing gated/);
assert.match(adminTemplate, /data-podcast-chapter-workbench/);
assert.match(adminTemplate, /data-podcast-chapter-rows/);
assert.match(adminTemplate, /Podcasting 2\.0 feeds/);
assert.match(adminTemplate, /data-podcast-review-form/);
assert.match(adminTemplate, /data-podcast-review-list/);
assert.match(adminTemplate, /feed the publication gate/);
assert.match(adminTemplate, /data-podcast-publication-readiness/);
assert.match(adminTemplate, /data-podcast-readiness-refresh/);
assert.match(adminTemplate, /Publish refreshes this snapshot immediately/);
assert.match(adminTemplate, /recently authenticated Admin or Super-admin/);
assert.match(adminTemplate, /data-podcast-clip-form/);
assert.match(adminTemplate, /data-podcast-clip-preview/);
assert.match(adminTemplate, /data-podcast-clip-list/);
assert.match(adminTemplate, /Word-accurate cuts stay locked/);
assert.match(adminTemplate, /authenticated preview and download/);
assert.match(adminTemplate, /data-podcast-clip-library-filters/);
assert.match(adminTemplate, /data-podcast-clip-library/);
assert.match(adminTemplate, /Find completed captioned clips/);
assert.match(adminTemplate, /data-podcast-clip-youtube-form/);
assert.match(adminTemplate, /data-podcast-clip-youtube-approve/);
assert.match(adminTemplate, /Never public/);
assert.match(adminTemplate, /recently authenticated super-admin/);
assert.match(adminTemplate, /data-podcast-marketing-link-form/);
assert.match(adminTemplate, /data-podcast-marketing-qr/);
assert.match(adminTemplate, /data-podcast-embed-form/);
assert.match(adminTemplate, /data-podcast-embed-preview/);
assert.match(adminTemplate, /Portable episode player/);
assert.match(adminTemplate, /Only published, publicly released revisions are eligible/);
assert.match(adminTemplate, /data-podcast-share-card-form/);
assert.match(adminTemplate, /data-podcast-share-card-preview/);
assert.match(adminTemplate, /1200×630 crawler-safe PNG/);
assert.match(adminTemplate, /no image SaaS or browser upload/);
assert.match(adminTemplate, /data-podcast-announcement-editor/);
assert.match(adminTemplate, /This checkpoint has no send route/);
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
assert.match(adminScript, /\/v1\/admin\/distribution\?showId=/);
assert.match(adminScript, /function renderDistribution/);
assert.match(adminScript, /function renderReleaseChannels/);
assert.match(adminScript, /function releaseStatusLabel/);
assert.match(adminScript, /Root jobs are shown separately from directory RSS ingestion/);
assert.match(adminScript, /fillDistributionEpisodes/);
assert.match(adminScript, /function retryReleaseChannel/);
assert.match(adminScript, /data-podcast-release-retry/);
assert.match(adminScript, /distribution\/\$\{encodeURIComponent\(destination\)\}\/retry/);
assert.match(adminScript, /function canOperateSelectedShowPublication/);
assert.match(adminScript, /function directoryObservationForm/);
assert.match(adminScript, /function updateDirectoryObservation/);
assert.match(adminScript, /data-podcast-directory-observation-form/);
assert.match(adminScript, /Save episode evidence/);
assert.match(adminScript, /function canManageSelectedShowDistribution/);
assert.match(adminScript, /rss-following directory/i);
assert.match(adminScript, /data-podcast-distribution-form/);
assert.match(adminScript, /ownerSetupStatus/);
assert.match(adminScript, /listingUrl/);
assert.match(adminScript, /ownerAccountLabel/);
assert.match(adminScript, /submissionDate/);
assert.match(adminScript, /submissionEvidenceUrl/);
assert.match(adminScript, /setupNotes/);
assert.match(adminTemplate, /Never paste a provider password or verification code/);
assert.match(adminScript, /method: "PATCH"/);
assert.match(adminScript, /url\.protocol !== "https:"/);
assert.match(adminScript, /navigator\.clipboard\.writeText\(value\)/);
assert.match(adminScript, /trusted sponsor-delivery evidence/i);
assert.match(adminScript, /mode: "timed_text"/);
assert.match(adminScript, /function loadChapters/);
assert.match(adminScript, /\/chapters\/approve/);
assert.match(adminScript, /function checkedHttpsUrl/);
assert.match(adminScript, /function loadProductionReviews/);
assert.match(adminScript, /function loadAudioQc/);
assert.match(adminScript, /function loadAudioQcPolicy/);
assert.match(adminScript, /function saveAudioQcPolicy/);
assert.match(adminScript, /function renderAudioQcRun/);
assert.match(
  adminScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\(showId\)\}\/audio-qc-policy/
);
assert.match(adminScript, /baseRevision: Number\(audioQcPolicy\.revision\)/);
assert.match(adminScript, /valueAsNumber/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/audio-qc/
);
assert.match(adminScript, /`qc_\$\{crypto\.randomUUID/);
assert.match(adminScript, /item\.append\(label, evidence\)/);
assert.match(adminStyles, /\.podcast-admin__audio-qc-findings/);
assert.match(adminScript, /function loadAudioMaster/);
assert.match(adminScript, /function approveSourceWorkingMaster/);
assert.match(adminScript, /function queueAudioEnhancementPreview/);
assert.match(
  adminScript,
  /audio-master\/approve-source/
);
assert.match(adminScript, /audio-enhancement-previews/);
assert.match(adminScript, /baseRevision: Number\(state\.revision/);
assert.match(adminScript, /acknowledgeExactSource/);
assert.match(adminScript, /DWDigestAudio\?\.mount/);
assert.match(adminScript, /audio\.crossOrigin = "use-credentials"/);
assert.match(adminScript, /function checkedAudioEnhancementMediaUrl/);
assert.match(
  adminScript,
  /mediaUrl\.origin !== apiBase\.origin/
);
assert.match(
  adminScript,
  /audio-enhancements\\\/\[A-Za-z0-9_-\]\+\\\/media/
);
assert.match(adminStyles, /\.podcast-admin__audio-enhancement-comparison/);
assert.match(adminScript, /\/review-comments\//);
assert.match(adminScript, /function publicationGateLabel/);
assert.match(adminScript, /body\.textContent = comment\.bodyText/);
assert.match(adminScript, /function loadPublicationReadiness/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/readiness/
);
assert.match(adminScript, /function renderPublicationReadiness/);
assert.match(adminScript, /summary\.textContent = String\(readinessNode\.summary/);
assert.match(adminScript, /publicationGateMode/);
assert.match(adminScript, /PUBLISH_WITH_BLOCKERS/);
assert.match(adminScript, /publication_override/);
assert.match(adminScript, /basePublicationRevision/);
assert.match(adminScript, /mode === "enforce"/);
assert.match(adminScript, /mode === "shadow"/);
assert.match(adminStyles, /\.podcast-admin \.btn[\s\S]*min-height: 2\.75rem/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/transcripts/
);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/transcription-jobs/
);
assert.match(adminScript, /expectedWorkingMasterId/);
assert.match(adminScript, /directProcessingEligible/);
assert.match(adminScript, /word timing not created/);
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
assert.match(adminScript, /downloadPath/);
assert.match(adminScript, /releaseClipMediaPlayers/);
assert.match(adminScript, /clip-renders/);
assert.match(adminScript, /loadClipLibrary/);
assert.match(adminScript, /renderClipLibrary/);
assert.match(adminScript, /data-podcast-clip-library-more/);
assert.match(
  adminScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\(selectedShowId\)\}\/clips/
);
assert.match(adminScript, /saveClipYouTubeDraft/);
assert.match(adminScript, /approveClipYouTubePublication/);
assert.match(adminScript, /clip-youtube-publications/);
assert.match(adminScript, /buildTaggedMarketingUrl/);
assert.match(adminScript, /createMarketingQr/);
assert.match(adminScript, /function publicMarketingEpisodes/);
assert.match(adminScript, /episode\.status === "published"/);
assert.match(adminScript, /\["public", "early_access", "free_mini"\]/);
assert.match(adminScript, /canonicalUrl\.origin !== showUrl\.origin/);
assert.match(adminScript, /data-dust-wave-podcast-embed/);
assert.match(adminScript, /frame\.loading = "lazy"/);
assert.match(adminScript, /frame\.referrerPolicy = "strict-origin-when-cross-origin"/);
assert.match(adminScript, /navigator\.clipboard\.writeText\(code\)/);
assert.match(adminScript, /function podcastPublicAssetUrls/);
assert.match(adminScript, /social-card\.png/);
assert.match(adminScript, /function updatePodcastShareCard/);
assert.match(adminScript, /safeMarketingFilename/);
assert.match(adminScript, /image\.width = 1200/);
assert.match(adminScript, /image\.height = 630/);
assert.match(adminScript, /marketing\/announcements\/dry-run/);
assert.match(adminScript, /announcementEditor\.getMarkdown/);
assert.doesNotMatch(adminScript, /\/marketing\/announcements\/send/);
assert.match(adminScript, /privacyStatus/);
assert.doesNotMatch(adminScript, /privacyStatus:\s*"public"/);
assert.doesNotMatch(adminScript, /startsAtMs:\s*clipForm/);
assert.doesNotMatch(adminScript, /endsAtMs:\s*clipForm/);
assert.doesNotMatch(adminScript, /(?:localStorage|sessionStorage).*(?:clip|caption)/i);
assert.doesNotMatch(
  adminScript,
  /(?:localStorage|sessionStorage)\.(?:setItem|getItem)\([^)]*transcript/i
);
assert.match(gulpfile, /copySharedAdminShell/);
assert.equal(sharedPackage.name, '@dustwave/admin-shell');
assert.equal(sharedPackage.version, '0.2.0');

const sharedSources = [
  'api-client.js',
  'editor.js',
  'editor-codec.js',
  'marketing-assets.js',
  'passwordless-session.js',
  'tabs.js'
];
for (const source of sharedSources) {
  await access(path.join(sharedRoot, 'src', source));
}
await access(path.join(
  sharedRoot,
  'src',
  'vendor',
  'qrcode-generator.js'
));
for (const source of sharedSources.filter((source) => source !== 'editor-codec.js')) {
  assert.match(
    adminScript,
    new RegExp(`dust-wave-admin-shell/${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  );
}

console.log('Validated the shared, fail-closed Podcast admin shell contract.');
