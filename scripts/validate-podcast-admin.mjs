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
const englishI18n = JSON.parse(
  await readFile(path.join(repositoryRoot, 'src/_data/i18n/en.json'), 'utf8')
);
const spanishI18n = JSON.parse(
  await readFile(path.join(repositoryRoot, 'src/_data/i18n/es.json'), 'utf8')
);
const englishWorkbench = englishI18n.podcast.admin.workbench;
const spanishWorkbench = spanishI18n.podcast.admin.workbench;
const englishWorkbenchText = JSON.stringify(englishWorkbench);
const englishRuntime = englishI18n.runtime.admin;
const spanishRuntime = spanishI18n.runtime.admin;
const englishRuntimeText = JSON.stringify(englishRuntime);
const staticRuntimeKeys = [
  ...adminScript.matchAll(/adminText\(\s*"([^"]+)"/g)
].map((match) => match[1]);
for (const key of new Set(staticRuntimeKeys)) {
  assert.equal(
    Object.hasOwn(englishRuntime, key),
    true,
    `English runtime admin translation is missing: ${key}`
  );
  assert.equal(
    Object.hasOwn(spanishRuntime, key),
    true,
    `Spanish runtime admin translation is missing: ${key}`
  );
}
const allowedProductNames = [
  'Apple Podcasts',
  'CPM',
  'Overcast',
  'Pocket Casts',
  'Podcast Addict',
  'Pool',
  'Spotify',
  'Stripe',
  'WhisperX 3.8.6'
];
const templateMarkup = adminTemplate.slice(adminTemplate.indexOf('<div'));
const hardcodedVisibleText = [
  ...new Set(
    templateMarkup
      .replace(/\{\{[\s\S]*?\}\}/g, '\n')
      .replace(/\{%[\s\S]*?%\}/g, '\n')
      .replace(/<[^>]*>/gs, '\n')
      .split('\n')
      .map((value) => value.trim())
      .filter((value) => /\p{L}/u.test(value))
  )
].sort();

assert.deepEqual(
  hardcodedVisibleText,
  allowedProductNames,
  'Podcast admin visible copy must come from the bilingual i18n dictionaries'
);
const gulpfile = await readFile(path.join(repositoryRoot, 'gulpfile.js'), 'utf8');
const sharedRoot = path.join(
  repositoryRoot,
  'shared/dust-wave-platform/packages/admin-shell'
);
const sharedPackage = JSON.parse(
  await readFile(path.join(sharedRoot, 'package.json'), 'utf8')
);

assert.match(adminTemplate, /translationKey: podcastAdmin/);
assert.match(adminTemplate, /i18nRuntime: true/);
assert.match(adminTemplate, /permalink: "\{\{ i18n\.config\.pages\.podcastAdmin\[language\] \}\}"/);
assert.match(adminLayout, /noindex,nofollow,noarchive/);
assert.match(adminLayout, /snippets\/language-switcher\.njk/);
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
assert.match(adminTemplate, /data-podcast-billing-refresh/);
assert.match(adminTemplate, /data-podcast-billing-export/);
assert.match(adminTemplate, /data-podcast-billing-status/);
assert.match(adminTemplate, /data-tab="subscribers"/);
assert.match(adminTemplate, /data-podcast-subscribers-filters/);
assert.match(adminTemplate, /data-podcast-subscribers-export/);
assert.match(adminTemplate, /data-podcast-subscribers-more/);
assert.match(adminTemplate, /workbench\.distribution\.tagline/);
assert.equal(
  englishWorkbench.distribution.tagline,
  'With just one click, we send your episodes live to 10+ platforms like Spotify, Apple and other major platforms.'
);
assert.match(
  spanishWorkbench.distribution.tagline,
  /más de 10 plataformas/
);
assert.match(
  englishWorkbench.distribution.canonicalFlow,
  /Each platform still requires one-time owner setup/
);
assert.doesNotMatch(adminTemplate, /<p lang="es">/);
assert.doesNotMatch(adminTemplate, /Publicación simplificada/);
assert.match(adminTemplate, /data-podcast-distribution-filter/);
assert.match(
  englishWorkbench.distribution.filterHelp,
  /exact RSS, News, YouTube, and per-directory states/
);
assert.match(adminTemplate, /data-tab="production"/);
assert.match(adminTemplate, /data-podcast-audio-qc/);
assert.match(adminTemplate, /data-podcast-audio-qc-queue/);
assert.match(adminTemplate, /data-podcast-audio-qc-policy-form/);
assert.match(englishWorkbenchText, /Admin and Super-admin changes apply only to future QC runs/);
assert.match(englishWorkbenchText, /Measure the immutable source/);
assert.match(englishWorkbenchText, /never overwrites audio or publishes an episode/);
assert.match(adminTemplate, /data-podcast-audio-master/);
assert.match(adminTemplate, /data-podcast-audio-master-approval/);
assert.match(adminTemplate, /data-podcast-audio-enhancement-form/);
assert.match(adminTemplate, /data-podcast-audio-enhancement-results/);
assert.match(englishWorkbenchText, /An enhancement preview is never a master/);
assert.match(englishWorkbenchText, /Replacing an approved master makes transcript, chapter, clip, and readiness approvals stale/);
assert.match(adminTemplate, /data-podcast-transcript-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-queue/);
assert.match(englishWorkbenchText, /Source-language transcription/);
assert.match(adminTemplate, /name="sourceLanguage"/);
assert.match(adminTemplate, /data-podcast-transcript-cues/);
assert.match(adminTemplate, /data-podcast-transcript-pages/);
assert.match(englishWorkbenchText, /Word timing gated/);
assert.match(adminTemplate, /data-podcast-alignment/);
assert.match(adminTemplate, /data-podcast-alignment-adapter/);
assert.match(englishWorkbenchText, /matching bilingual benchmark/);
assert.match(adminTemplate, /data-podcast-benchmark-form/);
assert.match(adminTemplate, /data-podcast-benchmark-refresh/);
assert.match(englishWorkbenchText, /raw file remains private and content-addressed/);
assert.match(adminTemplate, /data-podcast-chapter-workbench/);
assert.match(adminTemplate, /data-podcast-chapter-rows/);
assert.match(englishWorkbenchText, /Podcasting 2\.0 feeds/);
assert.match(adminTemplate, /data-podcast-review-form/);
assert.match(adminTemplate, /data-podcast-review-list/);
assert.match(englishWorkbenchText, /feed the publication gate/);
assert.match(adminTemplate, /data-podcast-publication-readiness/);
assert.match(adminTemplate, /data-podcast-readiness-refresh/);
assert.match(englishWorkbenchText, /Publish refreshes this snapshot immediately/);
assert.match(englishWorkbenchText, /recently authenticated Admin or Super-admin/);
assert.match(adminTemplate, /data-podcast-clip-form/);
assert.match(adminTemplate, /data-podcast-clip-preview/);
assert.match(adminTemplate, /data-podcast-clip-list/);
assert.match(englishWorkbenchText, /Word-accurate cuts stay locked/);
assert.match(englishWorkbenchText, /authenticated preview and download/);
assert.match(adminTemplate, /data-podcast-clip-library-filters/);
assert.match(adminTemplate, /data-podcast-clip-library/);
assert.match(englishWorkbenchText, /Find completed captioned clips/);
assert.match(adminTemplate, /data-podcast-clip-youtube-form/);
assert.match(adminTemplate, /data-podcast-clip-youtube-approve/);
assert.match(englishWorkbenchText, /Never public/);
assert.match(englishWorkbenchText, /recently authenticated super-admin/);
assert.match(adminTemplate, /data-podcast-marketing-link-form/);
assert.match(adminTemplate, /data-podcast-marketing-qr/);
assert.match(adminTemplate, /data-podcast-embed-form/);
assert.match(adminTemplate, /data-podcast-embed-preview/);
assert.match(englishWorkbenchText, /Portable episode player/);
assert.match(englishWorkbenchText, /Only published, publicly released revisions are eligible/);
assert.match(adminTemplate, /data-podcast-share-card-form/);
assert.match(adminTemplate, /data-podcast-share-card-preview/);
assert.match(englishWorkbenchText, /1200×630 crawler-safe PNG/);
assert.match(englishWorkbenchText, /no image SaaS or browser upload/);
assert.match(adminTemplate, /data-podcast-announcement-editor/);
assert.match(englishWorkbenchText, /Review never sends/);
assert.match(englishWorkbenchText, /staging records a dry-run/);
assert.match(adminTemplate, /data-podcast-announcement-approve/);
assert.match(adminTemplate, /data-podcast-announcement-history/);
assert.match(englishWorkbenchText, /Private evidence only/);
assert.match(adminTemplate, /data-tab="marketing"/);
assert.match(adminTemplate, /data-tab="sponsors"/);
assert.match(adminTemplate, /data-tab="analytics"/);
assert.match(adminTemplate, /data-podcast-reconciliation/);
assert.match(englishWorkbenchText, /Qualified sponsor deliveries/);
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
assert.match(englishRuntimeText, /runtime ads remain disabled/i);
assert.match(adminScript, /\/v1\/admin\/ads\/preview/);
assert.match(adminScript, /\/v1\/admin\/ads\/campaigns/);
assert.match(adminScript, /data-kill-campaign/);
assert.match(adminScript, /created\.upload\.lengthHeader/);
assert.match(adminScript, /\/v1\/admin\/ads\/creatives/);
assert.match(adminScript, /validated\.validationStatus !== "ready"/);
assert.match(adminScript, /payload\.previewOnly/);
assert.match(adminScript, /\/v1\/admin\/ads\/reconciliation/);
assert.match(adminScript, /\/v1\/admin\/billing\/readiness/);
assert.match(adminScript, /\/v1\/admin\/billing\/tax-evidence/);
assert.match(adminScript, /\/v1\/admin\/subscribers/);
assert.match(adminScript, /function loadSubscribers/);
assert.match(adminScript, /function renderSubscriberRecord/);
assert.match(adminScript, /function exportSubscribers/);
assert.match(adminScript, /requestCredentialedBlob/);
assert.match(adminScript, /maximumBytes: 4 \* 1024 \* 1024/);
assert.match(adminScript, /allowedContentTypes: \["text\/csv"\]/);
assert.match(adminScript, /exportUrl\.origin !== baseUrl\.origin/);
assert.match(adminScript, /function isSuperAdmin/);
assert.match(adminScript, /adminText\("checkingSession"/);
assert.match(adminScript, /adminText\("sendingLink"/);
assert.match(adminScript, /"linkSent"/);
assert.doesNotMatch(
  adminScript,
  /If that address is authorized[\s\S]{0,180}Si la dirección está autorizada/
);
assert.match(adminStyles, /\.podcast-admin__billing-readiness/);
assert.match(adminStyles, /\.podcast-admin__billing-evidence-list/);
assert.match(adminStyles, /\.podcast-admin__subscriber-list/);
assert.match(adminStyles, /\.podcast-admin__subscriber-sources/);
assert.match(
  adminStyles,
  /--dw-admin-space-xxs: 0\.25rem;[\s\S]+--dw-admin-space-4xl: 4rem;/,
  'Podcast Admin must preserve the Pool/Store 8px spacing scale'
);
assert.match(
  adminStyles,
  /\.podcast-admin__form \{[\s\S]+display: grid;[\s\S]+gap: var\(--dw-admin-space-md\);/,
  'Podcast Admin forms must use the shared 16px item rhythm'
);
assert.match(
  adminStyles,
  /\.podcast-admin label \{[\s\S]+gap: var\(--dw-admin-field-gap\);[\s\S]+margin: 0;/,
  'Podcast Admin labels must not add margins inside already-gapped grids'
);
assert.match(
  adminStyles,
  /repeat\(auto-fit, minmax\(min\(100%, 16rem\), 1fr\)\)/,
  'Podcast Admin field grids must collapse responsively without overflow'
);
assert.match(
  adminStyles,
  /\.podcast-admin__checkbox \{[\s\S]+min-height: var\(--dw-admin-control-min-height\);[\s\S]+padding: var\(--dw-admin-space-xs\) var\(--dw-admin-space-sm\);/,
  'Podcast Admin checkbox rows must retain Pool/Store touch sizing and spacing'
);
assert.match(
  adminStyles,
  /\.podcast-admin__status:empty \{[\s\S]+display: none;/,
  'Empty live regions must not reserve unexplained vertical space'
);
assert.match(
  adminTemplate,
  /<div class="podcast-admin__field">[\s\S]+workbench\.episodes\.notes[\s\S]+data-podcast-notes-editor/,
  'Standalone rich-text labels and editors must share one field wrapper'
);
assert.match(adminScript, /\/v1\/admin\/distribution\?showId=/);
assert.match(adminScript, /function renderDistribution/);
assert.match(adminScript, /function renderReleaseChannels/);
assert.match(adminScript, /function releaseStatusLabel/);
assert.match(
  englishRuntimeText,
  /Root jobs are shown separately from directory RSS ingestion/
);
assert.match(adminScript, /fillDistributionEpisodes/);
assert.match(adminScript, /function retryReleaseChannel/);
assert.match(adminScript, /data-podcast-release-retry/);
assert.match(adminScript, /distribution\/\$\{encodeURIComponent\(destination\)\}\/retry/);
assert.match(adminScript, /function canOperateSelectedShowPublication/);
assert.match(adminScript, /function directoryObservationForm/);
assert.match(adminScript, /function updateDirectoryObservation/);
assert.match(adminScript, /data-podcast-directory-observation-form/);
assert.match(englishRuntimeText, /Save episode evidence/);
assert.match(adminScript, /function canManageSelectedShowDistribution/);
assert.match(englishRuntimeText, /RSS-following directory/);
assert.match(adminScript, /data-podcast-distribution-form/);
assert.match(adminScript, /ownerSetupStatus/);
assert.match(adminScript, /listingUrl/);
assert.match(adminScript, /ownerAccountLabel/);
assert.match(adminScript, /submissionDate/);
assert.match(adminScript, /submissionEvidenceUrl/);
assert.match(adminScript, /setupNotes/);
assert.match(
  englishWorkbench.distribution.credentialSafety,
  /Never paste a provider password or verification code/
);
assert.match(adminScript, /method: "PATCH"/);
assert.match(adminScript, /url\.protocol !== "https:"/);
assert.match(adminScript, /navigator\.clipboard\.writeText\(value\)/);
assert.match(englishRuntimeText, /trusted sponsor-delivery evidence/i);
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
assert.match(
  adminStyles,
  /\.podcast-admin \.btn[\s\S]*min-height: var\(--dw-admin-control-min-height\)/
);
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
assert.match(adminScript, /chunk_processor_required/);
assert.match(adminScript, /process-transcription-chunks\.yml/);
assert.match(englishRuntimeText, /word timing not created/);
assert.match(adminScript, /baseRevision: Number\(transcript\.revision/);
assert.match(adminScript, /expectedRevision: Number\(transcript\.revision\)/);
assert.match(adminScript, /speakerConfirmed/);
assert.match(adminScript, /wordControlsEnabled/);
assert.match(adminScript, /function loadAlignmentJobs/);
assert.match(adminScript, /function queueAlignment/);
assert.match(adminScript, /function approveAlignment/);
assert.match(adminScript, /function loadAlignmentBenchmarks/);
assert.match(adminScript, /function importAlignmentBenchmark/);
assert.match(adminScript, /process-alignment\.yml/);
assert.match(adminScript, /\/v1\/admin\/alignment-benchmarks/);
assert.match(adminScript, /MAXIMUM_ALIGNMENT_BENCHMARK_BYTES/);
assert.match(
  adminScript,
  /\/v1\/admin\/episodes\/\$\{encodeURIComponent\(episodeId\)\}\/alignments/
);
assert.match(adminScript, /expectedTranscriptRevision/);
assert.match(adminScript, /structurallyEligible/);
assert.match(adminScript, /benchmark\?\.passedRunId/);
assert.match(adminStyles, /\.podcast-admin__benchmark-list/);
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
assert.match(englishRuntimeText, /This is not a completed render/);
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
assert.match(adminScript, /marketing\/announcements\/approve/);
assert.match(
  adminScript,
  /marketing\/announcements\?limit=20/
);
assert.match(adminScript, /function approveAnnouncement/);
assert.match(adminScript, /function loadAnnouncementHistory/);
assert.match(adminScript, /function canApproveSelectedShowAnnouncement/);
assert.match(adminScript, /review\.deliveryMode === "live"/);
assert.match(adminScript, /globalThis\.confirm/);
assert.match(adminScript, /announcementEditor\.getMarkdown/);
assert.doesNotMatch(adminScript, /\/marketing\/announcements\/send/);
assert.doesNotMatch(
  adminScript,
  /announcement\.(?:email|listenerId|destinationHash)/
);
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
assert.equal(sharedPackage.version, '0.3.0');

const sharedSources = [
  'api-client.js',
  'credentialed-download.js',
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
