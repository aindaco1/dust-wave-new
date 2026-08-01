import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  sharedAdminShellPackage,
  sharedAdminShellVersion
} from './lib/shared-admin-shell-version.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const adminTemplate = await readFile(
  path.join(repositoryRoot, 'src/admin/podcasts/index.njk'),
  'utf8'
);
const adminLayout = await readFile(
  path.join(repositoryRoot, 'src/_includes/layouts/podcast-admin.njk'),
  'utf8'
);
const authFooter = await readFile(
  path.join(
    repositoryRoot,
    'src/_includes/snippets/podcast-auth-footer.njk'
  ),
  'utf8'
);
const adminScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin.js'),
  'utf8'
);
const workspaceScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-workspaces.js'),
  'utf8'
);
const episodeContextScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-episode-context.js'),
  'utf8'
);
const episodeContextSetupScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-episode-context-setup.js'),
  'utf8'
);
const readinessCopyScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-readiness-copy.js'),
  'utf8'
);
const showContextScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-show-context.js'),
  'utf8'
);
const showSettingsScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-show-settings.js'),
  'utf8'
);
const showProjectionScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-show-projection.js'),
  'utf8'
);
const showPricesScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-show-prices.js'),
  'utf8'
);
const transcriptDiagnosticsScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-transcript-review.js'
  ),
  'utf8'
);
const transcriptDiagnosticNavigationScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-transcript-diagnostic-navigation.js'
  ),
  'utf8'
);
const transcriptSpeakerRangeScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-transcript-speaker-range.js'
  ),
  'utf8'
);
const clipPublicationScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-clip-publications.js'
  ),
  'utf8'
);
const audioDerivativeScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-audio-derivatives.js'
  ),
  'utf8'
);
const deliveryAudioScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-delivery-audio.js'),
  'utf8'
);
const deliveryAudioApprovalScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-delivery-audio-approval.js'
  ),
  'utf8'
);
const marketingLinksScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-marketing-links.js'),
  'utf8'
);
const rssImportScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-rss-import.js'),
  'utf8'
);
const rssImportReconciliationScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-rss-reconciliation.js'
  ),
  'utf8'
);
const rssImportCutoverScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-rss-cutover.js'),
  'utf8'
);
const rssImportActivationApprovalScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-rss-activation-approval.js'
  ),
  'utf8'
);
const catalogScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-catalog.js'),
  'utf8'
);
const episodeEditorScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-episode-editor.js'),
  'utf8'
);
const showNotesScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-show-notes.js'),
  'utf8'
);
const chapterDraftScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-chapter-draft.js'),
  'utf8'
);
const clipDraftScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-clip-draft.js'),
  'utf8'
);
const clipPreviewScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-clip-preview.js'),
  'utf8'
);
const downloadActionsScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-download-actions.js'),
  'utf8'
);
const transcriptImportScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-transcript-import.js'),
  'utf8'
);
const transcriptSearchScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-transcript-search.js'),
  'utf8'
);
const unsavedChangesScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-unsaved-changes.js'),
  'utf8'
);
const unsavedChangesCoreScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-unsaved-changes-core.js'),
  'utf8'
);
const adminConstantsScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-constants.js'),
  'utf8'
);
const publicationScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-publication.js'),
  'utf8'
);
const publicationSecurityScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-publication-security.js'
  ),
  'utf8'
);
const requestSecurityScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-request-security.js'),
  'utf8'
);
const analyticsScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-analytics.js'),
  'utf8'
);
const distributionCertificationScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-distribution-certification.js'
  ),
  'utf8'
);
const distributionDisclosureScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-distribution-disclosure.js'
  ),
  'utf8'
);
const youtubeAudioRenditionScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-youtube-audio-renditions.js'
  ),
  'utf8'
);
const episodeYoutubeScript = await readFile(
  path.join(repositoryRoot, 'src/js/podcast-admin-episode-youtube.js'),
  'utf8'
);
const adminMockApi = await readFile(
  path.join(repositoryRoot, 'tests/fixtures/podcast-admin-mock-api.mjs'),
  'utf8'
);
const adminConfig = await readFile(
  path.join(repositoryRoot, 'src/_data/podcastAdmin.js'),
  'utf8'
);
const podcastApiConfig = await readFile(
  path.join(repositoryRoot, 'src/_data/podcastApi.js'),
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
const topLevelAdminTabs = Array.from(
  adminTemplate.matchAll(/role="tab"\s+data-tab="([^"]+)"/g),
  (match) => match[1]
);
assert.deepEqual(
  topLevelAdminTabs,
  [
    'episodes',
    'distribution',
    'marketing',
    'audience',
    'monetization',
    'settings'
  ],
  'Podcast Admin must expose six task-oriented top-level sections'
);
assert.doesNotMatch(
  adminTemplate,
  /podcast-tab-(?:overview|production|sponsors|analytics|subscribers|billing)/,
  'System-oriented tools must not return as top-level Podcast Admin tabs'
);
assert.match(
  adminTemplate,
  /data-podcast-workspace-group="production"/,
  'Production tools must remain inside the episode-centered workflow'
);
assert.match(
  adminTemplate,
  /id="podcast-panel-audience"[\s\S]+data-podcast-workspace-group="analytics"[\s\S]+data-podcast-workspace-group="subscribers"/,
  'Audience must group analytics and subscribers contextually'
);
assert.match(
  adminTemplate,
  /id="podcast-panel-monetization"[\s\S]+data-podcast-workspace-group="sponsors"[\s\S]+data-podcast-workspace-group="billing"/,
  'Monetization must group sponsors and premium evidence contextually'
);
assert.equal(
  [...adminTemplate.matchAll(/data-podcast-current-episode/g)].length,
  1,
  'Episodes must expose one canonical current-episode selector'
);
assert.equal(
  [...adminTemplate.matchAll(/data-podcast-show-context/g)].length,
  2,
  'Episode and Settings headings must reuse the same show-context contract'
);
assert.equal(
  [...adminTemplate.matchAll(/data-podcast-show-name/g)].length,
  2,
  'Each show context must support a non-interactive single-show label'
);
assert.match(
  adminTemplate,
  /data-podcast-episode-context[\s\S]+data-podcast-current-episode[\s\S]+data-podcast-publish-workflow/,
  'The current episode must precede and control the publishing workflow'
);
for (const workbench of [englishWorkbench, spanishWorkbench]) {
  assert.equal(typeof workbench.episodes.currentEpisode, 'string');
  assert.equal(typeof workbench.episodes.currentEpisodeHelp, 'string');
}
const controlledYoutubeErrorCodes = [
  'youtube_controlled_test_not_configured',
  'youtube_not_configured',
  'youtube_oauth_failed',
  'youtube_channel_verification_failed',
  'youtube_queue_failed'
];
for (const code of controlledYoutubeErrorCodes) {
  const key = `error_${code}`;
  assert.equal(
    typeof englishRuntime[key],
    'string',
    `English admin translation is missing controlled YouTube error: ${code}`
  );
  assert.equal(
    typeof spanishRuntime[key],
    'string',
    `Spanish admin translation is missing controlled YouTube error: ${code}`
  );
  assert.match(englishRuntime[key], /No upload/);
  assert.match(spanishRuntime[key], /No se /);
}
const staticRuntimeKeys = [
  ...adminScript.matchAll(/adminText\(\s*"([^"]+)"/g),
  ...distributionCertificationScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...distributionDisclosureScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...audioDerivativeScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...analyticsScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...marketingLinksScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...catalogScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportReconciliationScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportCutoverScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportActivationApprovalScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...youtubeAudioRenditionScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...episodeYoutubeScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...showPricesScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...transcriptDiagnosticsScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...transcriptDiagnosticNavigationScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...transcriptSearchScript.matchAll(/text\(\s*"([^"]+)"/g)
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
const sharedPackage = sharedAdminShellPackage;

assert.match(adminTemplate, /translationKey: podcastAdmin/);
assert.match(adminTemplate, /i18nRuntime: true/);
assert.match(
  adminTemplate,
  /class="podcast-auth-turnstile podcast-admin__turnstile"/
);
assert.match(adminTemplate, /permalink: "\{\{ i18n\.config\.pages\.podcastAdmin\[language\] \}\}"/);
assert.match(adminLayout, /noindex,nofollow,noarchive/);
assert.match(adminLayout, /snippets\/podcast-auth-footer\.njk/);
assert.match(authFooter, /snippets\/language-switcher\.njk/);
assert.match(adminLayout, /type="module" src="\/js\/podcast-admin\.js\?v=\{\{ assets\.version/);
assert.match(
  adminLayout,
  /type="module" src="\/js\/podcast-admin-transcript-speaker-range\.js\?v=\{\{ assets\.version/
);
assert.match(adminLayout, /src="\/js\/audio-player\.js\?v=\{\{ assets\.version/);
assert.doesNotMatch(
  adminLayout,
  /turnstile\/v0\/api\.js/,
  'Authenticated admin sessions must not eagerly load the Turnstile runtime'
);
assert.match(
  adminScript,
  /function showLoggedOut\(\) \{[\s\S]+initializeTurnstile\(\);/,
  'Turnstile must initialize only when the login surface is needed'
);
assert.match(
  adminScript,
  /showAuthenticated\(result\.identity\);[\s\S]+await Promise\.all\(\[loadShows\(\), loadAlignmentBenchmarks\(\)\]\);[\s\S]+app\.hidden = false;/,
  'Authenticated admin content must reveal only after its initial data has settled'
);
assert.match(
  adminScript,
  /function loadTurnstile\(\) \{[\s\S]+document\.head\.append\(script\);/,
  'The login surface must load Turnstile on demand'
);
assert.match(adminConfig, /require\("\.\/podcastApi\.js"\)\.apiOrigin/);
assert.match(podcastApiConfig, /https:\/\/feeds\.dustwave\.xyz/);
assert.doesNotMatch(adminConfig, /workers\.dev/);
assert.doesNotMatch(podcastApiConfig, /workers\.dev/);
assert.match(
  adminTemplate,
  /data-podcast-auth aria-labelledby="podcast-login-title" hidden/,
  'The login surface must remain concealed until the session check resolves'
);
assert.match(adminTemplate, /data-tab="settings"/);
assert.match(adminTemplate, /id="podcast-panel-settings"/);
assert.equal(
  [...adminTemplate.matchAll(/data-podcast-show-form/g)].length,
  1,
  'Show settings must keep one DRY save form'
);
for (const field of [
  "language",
  "status",
  "authorName",
  "category",
  "artworkUrl",
  "canonicalUrl",
  "feedUrl",
  "explicit"
]) {
  assert.match(adminTemplate, new RegExp(`name="${field}"`));
}
assert.match(adminTemplate, /name="canonicalUrl"[^>]+readonly/);
assert.match(adminTemplate, /name="feedUrl"[^>]+readonly/);
assert.match(
  adminTemplate,
  /name="artworkUrl"[\s\S]{0,180}pattern="https:\/\/\.\*"/
);
assert.match(
  adminTemplate,
  /name="youtubeChannelUrl"[\s\S]{0,260}pattern="https:\/\/\(www\\\.\|m\\\.\)\?youtube\\\.com\//
);
assert.match(
  showSettingsScript,
  /language: form\.elements\.language\.value[\s\S]+explicit: form\.elements\.explicit\.checked/
);
assert.match(adminScript, /archiveShowConfirm/);
assert.match(adminScript, /readShowSettingsPayload\(showForm\)/);
assert.match(adminTemplate, /data-podcast-site-projection-preview/);
assert.match(adminTemplate, /data-podcast-site-projection-summary/);
assert.match(adminTemplate, /data-podcast-site-projection-confirmation-hint/);
assert.match(adminTemplate, /data-podcast-site-projection-form/);
assert.match(
  showProjectionScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\(showId\)\}\/site-projection/
);
assert.match(
  showProjectionScript,
  /expectedCatalogSha: preview\.catalogSha,[\s\S]+confirmation/
);
assert.match(
  showProjectionScript,
  /PUBLISH_SHOW_CATALOG \$\{show\.id\}/
);
assert.doesNotMatch(showProjectionScript, /innerHTML|insertAdjacentHTML/);
assert.match(adminTemplate, /data-podcast-show-prices-summary/);
assert.match(adminTemplate, /data-podcast-show-prices-blockers/);
assert.match(adminTemplate, /data-podcast-show-prices-form/);
assert.match(adminTemplate, /name="monthlyDollars"[^>]+step="0\.01"/);
assert.match(adminTemplate, /name="annualDollars"[^>]+step="0\.01"/);
assert.match(
  showPricesScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\(showId\)\}\/premium-prices/
);
assert.match(
  showPricesScript,
  /expectedMonthlyCents: configuration\.monthlyCents,[\s\S]+expectedAnnualCents: configuration\.annualCents/
);
assert.match(
  showPricesScript,
  /CONFIGURE_SHOW_PRICES/
);
assert.doesNotMatch(showPricesScript, /innerHTML|insertAdjacentHTML/);
assert.match(adminScript, /showSiteProjection\.setShow\(show\)/);
assert.match(
  englishWorkbench.overview.siteProjectionIntro,
  /preserving local artwork variants/
);
assert.match(
  spanishWorkbench.overview.siteProjectionIntro,
  /conserva las variantes locales/
);
assert.equal(englishRuntime.siteProjectionTargetLabel, 'Target');
assert.equal(spanishRuntime.siteProjectionTargetLabel, 'Destino');
assert.equal(englishI18n.podcast.admin.tabs.settings, 'Settings');
assert.equal(spanishI18n.podcast.admin.tabs.settings, 'Configuración');
assert.match(
  adminScript,
  /const showContext = mountPodcastShowContext\(root\);[\s\S]+const showSelects = showContext\.selects;[\s\S]+showContext\.setShows\(shows, selectedShowId\)/
);
assert.match(
  showContextScript,
  /singleShow = normalized\.length === 1[\s\S]+select\.hidden = Boolean\(singleShow\)[\s\S]+name\.hidden = !singleShow/,
  'single-show mode must remove selector chrome without removing its state'
);
assert.doesNotMatch(
  showContextScript,
  /innerHTML|insertAdjacentHTML|localStorage|sessionStorage|\bfetch\s*\(/,
  'show context must remain local and render only through DOM text'
);
assert.match(adminTemplate, /data-podcast-episode-form/);
assert.match(adminTemplate, /data-podcast-episode-form-heading/);
assert.match(adminTemplate, /data-podcast-episode-edit-cancel/);
assert.match(adminTemplate, /data-podcast-episode-slug-help/);
assert.match(adminTemplate, /data-podcast-show-notes/);
assert.match(adminTemplate, /data-podcast-show-notes-review/);
assert.match(
  showNotesScript,
  /reviewRequired !== true[\s\S]+value\.saved !== false/,
  'AI show-notes responses must prove review-only, unsaved semantics'
);
assert.match(
  showNotesScript,
  /notesEditor\.setValue\(result\.draft\.showNotesMarkdown\)/,
  'AI show notes may enter only the existing sanitized editor'
);
assert.doesNotMatch(
  showNotesScript,
  /innerHTML|insertAdjacentHTML/,
  'AI show-notes evidence and drafts must render without HTML sinks'
);
assert.match(adminTemplate, /data-podcast-chapter-draft/);
assert.match(adminTemplate, /data-podcast-chapter-draft-review/);
assert.match(
  chapterDraftScript,
  /includedCueCount !== totalCueCount[\s\S]+source\.truncated !== false/,
  'AI chapter proposals must prove complete transcript coverage'
);
assert.match(
  chapterDraftScript,
  /applyChapters\(result\.draft\.chapters\.map/,
  'AI chapter proposals may enter only the unsaved chapter editor'
);
assert.doesNotMatch(
  chapterDraftScript,
  /innerHTML|insertAdjacentHTML/,
  'AI chapter evidence and proposals must render without HTML sinks'
);
assert.match(adminTemplate, /data-podcast-clip-draft/);
assert.match(adminTemplate, /data-podcast-clip-draft-review/);
assert.match(
  clipDraftScript,
  /includedCueCount !== totalCueCount[\s\S]+source\.truncated !== false/,
  'AI clip candidates must prove complete transcript coverage'
);
assert.match(
  clipDraftScript,
  /form\.reset\(\)[\s\S]+fillCueSelects\(candidate\)[\s\S]+refreshRecipe\(\)/,
  'AI clip candidates may enter only a new unsaved clip recipe'
);
assert.doesNotMatch(
  clipDraftScript,
  /innerHTML|insertAdjacentHTML/,
  'AI clip evidence and candidates must render without HTML sinks'
);
assert.match(adminTemplate, /data-podcast-clip-preview[\s\S]+aria-atomic="true"/);
assert.match(
  clipPreviewScript,
  /renderClipLayoutPreview\([\s\S]+caption:[\s\S]+clipCueSummary/,
  'clip recipe preview must derive its caption from the selected approved cue'
);
assert.match(
  clipPreviewScript,
  /dataset\.aspectRatio = normalizedAspect/,
  'clip recipe preview must expose its normalized responsive aspect ratio'
);
assert.doesNotMatch(
  clipPreviewScript,
  /innerHTML|insertAdjacentHTML/,
  'clip recipe preview must render transcript content without HTML sinks'
);
assert.match(
  adminScript,
  /captionsUrl = adminApiUrl\(render\?\.captionsPath\)[\s\S]+subtitlesUrl = adminApiUrl\(render\?\.subtitlesPath\)[\s\S]+clipDownloadActionMarkup/,
  'ready Production and Marketing clips must reuse authenticated caption paths'
);
assert.match(
  downloadActionsScript,
  /downloadMp4[\s\S]+downloadVtt[\s\S]+downloadSrt/,
  'MP4, VTT, and SRT must share one download-action renderer'
);
assert.match(
  adminMockApi,
  /captionsPath:[\s\S]+clip_render_browser_fixture\/captions\.vtt[\s\S]+subtitlesPath:[\s\S]+clip_render_browser_fixture\/captions\.srt/,
  'browser QA must expose deterministic private VTT and SRT sidecars'
);
assert.match(
  adminTemplate,
  /data-podcast-transcript-downloads/,
  'saved transcript exports must stay in the existing Production workbench'
);
assert.match(
  downloadActionsScript,
  /transcripts\/\$\{language\}\/captions\.\$\{format\}/,
  'saved transcript downloads must build exact first-party caption paths'
);
assert.match(
  downloadActionsScript,
  /createElement\("a"\)[\s\S]+replaceChildren\(\.\.\.links\)/,
  'saved transcript download actions must use DOM APIs'
);
assert.doesNotMatch(
  downloadActionsScript,
  /innerHTML|insertAdjacentHTML/,
  'saved transcript labels and URLs must not use DOM HTML sinks'
);
assert.match(
  adminMockApi,
  /transcriptCaptionMatch[\s\S]+application\/x-subrip/,
  'browser QA must expose deterministic saved transcript VTT/SRT responses'
);
for (const selector of [
  "data-podcast-transcript-import",
  "data-podcast-transcript-import-form",
  "data-podcast-transcript-import-file",
  "data-podcast-transcript-import-submit",
  "data-podcast-transcript-import-status"
]) {
  assert.match(
    adminTemplate,
    new RegExp(selector),
    `caption import must expose ${selector}`
  );
}
assert.match(
  adminTemplate,
  /accept="\.vtt,\.srt,text\/vtt,application\/x-subrip,application\/srt,text\/srt"/,
  'caption import must be explicitly bounded to WebVTT and SubRip'
);
assert.match(
  transcriptImportScript,
  /MAXIMUM_FILE_BYTES = 1_000_000[\s\S]+MAXIMUM_CUES = 10_000[\s\S]+MAXIMUM_CUE_DURATION_MS = 120_000/,
  'caption import must mirror the bounded transcript review limits'
);
assert.match(
  transcriptImportScript,
  /speakerConfirmed: false[\s\S]+hasExistingContent\(\)[\s\S]+confirmReplace/,
  'caption import must keep voice labels unconfirmed and protect existing work'
);
assert.doesNotMatch(
  transcriptImportScript,
  /\bfetch\s*\(|AdminApiClient|innerHTML|insertAdjacentHTML/,
  'caption import must remain browser-local and avoid HTML sinks'
);
assert.match(
  adminScript,
  /mountTranscriptCaptionImport\([\s\S]+transcript\.cues = cues[\s\S]+transcriptDirty = true[\s\S]+renderTranscript\(\)/,
  'caption import must reuse the existing unsaved transcript editor and save path'
);
for (const selector of [
  "data-podcast-transcript-search",
  "data-podcast-transcript-search-form",
  "data-podcast-transcript-search-input",
  "data-podcast-transcript-search-previous",
  "data-podcast-transcript-search-next",
  "data-podcast-transcript-search-status"
]) {
  assert.match(
    adminTemplate,
    new RegExp(selector),
    `transcript search must expose ${selector}`
  );
}
assert.match(
  adminTemplate,
  /data-podcast-transcript-search-form[\s\S]+role="search"[\s\S]+type="search"[\s\S]+maxlength="160"[\s\S]+aria-controls="podcast-transcript-cues"[\s\S]+aria-describedby="podcast-transcript-search-status"[\s\S]+role="status"[\s\S]+aria-live="polite"[\s\S]+id="podcast-transcript-cues"/,
  'transcript search must expose bounded semantic search and live results'
);
assert.match(
  transcriptSearchScript,
  /maximumQueryCharacters:\s*160[\s\S]+maximumCues:\s*10_000/,
  'transcript search must stay within the loaded review bounds'
);
assert.match(
  transcriptSearchScript,
  /transcriptCuePlainText[\s\S]+normalizedSearchText[\s\S]+normalize\("NFKD"\)/,
  'transcript search must reuse normalized visible cue text'
);
assert.match(
  transcriptSearchScript,
  /onOpenCue\(currentCueIndex\)/,
  'transcript search must reuse the existing cue navigator'
);
assert.doesNotMatch(
  transcriptSearchScript,
  /\bfetch\s*\(|AdminApiClient|innerHTML|insertAdjacentHTML|localStorage|sessionStorage/,
  'transcript search must remain browser-local and avoid persistence or HTML sinks'
);
assert.match(
  adminScript,
  /mountTranscriptSearch\([\s\S]+syncVisibleTranscriptCues\(\{ requireText: false \}\)[\s\S]+onOpenCue: openTranscriptCue/,
  'transcript search must reuse the current unsaved cue state and pagination'
);
assert.match(
  episodeContextSetupScript,
  /mountPodcastReviewDraftGuard\([\s\S]+hasTranscriptChanges[\s\S]+hasChapterChanges/,
  'review drafts must expose consumer-owned dirty state to the shared guard'
);
assert.match(
  adminScript,
  /mountPodcastEpisodeContext\([\s\S]+episodeSelect: currentEpisodeSelect/,
  'the publishing workflow must reuse the canonical current-episode selector'
);
assert.match(
  episodeContextScript,
  /new Set\(controls\)/,
  'internal tools must share one guarded, deduplicated episode context'
);
assert.match(episodeContextScript, /label\.hidden = true/);
assert.match(episodeContextScript, /stopImmediatePropagation/);
assert.doesNotMatch(
  episodeContextScript,
  /innerHTML|insertAdjacentHTML|localStorage|sessionStorage|\bfetch\s*\(/,
  'episode context must remain local and avoid HTML sinks or persistence'
);
assert.match(
  unsavedChangesCoreScript,
  /mountUnsavedChangesGuard[\s\S]+stopImmediatePropagation[\s\S]+discardTranscriptChanges[\s\S]+discardChapterChanges/,
  'review draft transitions must cancel before consumer loaders and reuse the shared lifecycle guard'
);
assert.doesNotMatch(
  unsavedChangesCoreScript,
  /\bfetch\s*\(|innerHTML|insertAdjacentHTML|localStorage|sessionStorage/,
  'the review draft guard must remain browser-local without persistence or HTML sinks'
);
assert.match(adminTemplate, /data-podcast-upload-form/);
assert.match(adminTemplate, /data-podcast-rss-import-form/);
assert.match(adminTemplate, /data-podcast-rss-import-preview/);
assert.match(adminTemplate, /data-podcast-rss-import-plans/);
assert.match(
  englishWorkbench.overview.importPreviewOnly,
  /no episode, media object, redirect, directory, or provider state will change/
);
assert.match(
  spanishWorkbench.overview.importPreviewOnly,
  /no cambiará ningún episodio/
);
assert.match(
  rssImportScript,
  /\/rss-import\/preview/
);
assert.match(
  rssImportScript,
  /\/rss-import\/plans/
);
assert.match(
  rssImportScript,
  /expectedFeedSha256:[\s\S]+selectedSourceIdentitySha256/
);
assert.match(
  rssImportScript,
  /assessPodcastGuidCompatibility\([\s\S]+podcastGuidStatus === "absent"[\s\S]+state: "mismatch"/,
  "RSS migration must classify source and destination channel identity"
);
assert.match(
  rssImportScript,
  /renderSelectionControls\([\s\S]+podcastGuidAssessment\.ready/,
  "RSS migration selection must remain hidden when channel identity conflicts"
);
assert.match(
  rssImportScript,
  /\/rss-import\/podcast-guid[\s\S]+expectedPodcastGuid:[\s\S]+assignmentConfirmed: true/,
  "One-time channel identity assignment must bind the exact preview evidence"
);
assert.match(
  rssImportScript,
  /rssImportPodcastGuidAssignFinalConfirmation[\s\S]+globalThis\.confirm/,
  "One-time channel identity assignment must require final confirmation"
);
assert.match(
  rssImportScript,
  /rssImportSourcePodcastGuid[\s\S]+rssImportTargetPodcastGuid[\s\S]+rssImportPodcastGuidStatus/,
  "RSS migration preview must present source and destination identity evidence"
);
assert.match(
  rssImportScript,
  /expectedSelectionSha256:[\s\S]+reviewConfirmed: true/
);
assert.match(
  rssImportScript,
  /\/rss-import\/plans\/\$\{[\s\S]+\/execution/
);
assert.match(
  rssImportScript,
  /expectedFeedSha256: plan\.feedSha256[\s\S]+expectedSelectionSha256: plan\.selectionSha256[\s\S]+executionConfirmed:/
);
assert.match(
  rssImportScript,
  /podcastRssImportExecutionItem[\s\S]+targetSlug[\s\S]+sourceLanguage/
);
assert.match(
  rssImportScript,
  /createRssImportReconciliationController/
);
assert.match(
  rssImportReconciliationScript,
  /\/rss-import\/plans\/\$\{[\s\S]+\/reconciliation/
);
assert.match(
  rssImportReconciliationScript,
  /reconciliationId:[\s\S]+expectedEvidenceSha256:[\s\S]+reconciliationConfirmed: true/
);
assert.match(
  rssImportReconciliationScript,
  /\/rss-import\/plans\/\$\{[\s\S]+\/redirect-attestation/
);
assert.match(
  rssImportReconciliationScript,
  /attestationId:[\s\S]+expectedReconciliationEvidenceSha256:[\s\S]+ownerControlConfirmed: true[\s\S]+permanenceAcknowledged: true[\s\S]+noActivationConfirmed: true/
);
assert.match(
  rssImportReconciliationScript,
  /state\.oldHostRedirectChecklist[\s\S]+ownerRedirectAttested/
);
assert.match(
  rssImportCutoverScript,
  /state\.cutoverReadiness[\s\S]+\/cutover-packet/
);
assert.match(
  rssImportCutoverScript,
  /packetId:[\s\S]+expectedEvidenceSha256:[\s\S]+ownerReviewConfirmed: true[\s\S]+noActivationConfirmed: true/
);
assert.match(
  rssImportCutoverScript,
  /createRssImportActivationApprovalController/
);
assert.match(
  rssImportActivationApprovalScript,
  /\/rss-import\/plans\/\$\{[\s\S]+\/redirect-activation-approval/
);
assert.match(
  rssImportActivationApprovalScript,
  /approvalId:[\s\S]+expectedPacketId:[\s\S]+expectedEvidenceSha256:[\s\S]+finalReviewConfirmed: true[\s\S]+manualActionAcknowledged: true[\s\S]+rollbackPlanConfirmed: true[\s\S]+noActivationPerformedConfirmed: true/
);
assert.doesNotMatch(
  rssImportReconciliationScript,
  /innerHTML/,
  "Untrusted reconciliation evidence must use DOM text nodes"
);
assert.doesNotMatch(
  rssImportCutoverScript,
  /innerHTML/,
  "Untrusted cutover evidence must use DOM text nodes"
);
assert.doesNotMatch(
  rssImportActivationApprovalScript,
  /innerHTML/,
  "Untrusted activation-approval evidence must use DOM text nodes"
);
assert.match(
  englishRuntime.rssImportExecutionNoPublish,
  /cannot publish News, RSS, redirects, directories, YouTube, email, ads, or billing/
);
assert.match(
  spanishRuntime.rssImportExecutionNoPublish,
  /no puede publicar Noticias, RSS, redirecciones, directorios, YouTube, correos, anuncios ni facturación/
);
assert.match(
  englishRuntime.rssImportReconciliationNoPublish,
  /cannot publish an episode[\s\S]+activate a redirect/
);
assert.match(
  spanishRuntime.rssImportReconciliationNoPublish,
  /No puede publicar un episodio[\s\S]+activar una redirección/
);
assert.match(
  englishRuntime.rssImportRedirectUnavailable,
  /activation is intentionally unavailable/
);
assert.match(
  spanishRuntime.rssImportRedirectUnavailable,
  /no está disponible intencionalmente/
);
assert.match(
  englishRuntime.rssImportCutoverNoActivation,
  /cannot contact the old host[\s\S]+activate a new-feed tag or HTTP 301/
);
assert.match(
  spanishRuntime.rssImportCutoverNoActivation,
  /No puede contactar el host anterior[\s\S]+activar una etiqueta de nuevo feed o HTTP 301/
);
assert.match(
  englishRuntime.rssImportActivationApprovalBoundary,
  /manual owner handoff[\s\S]+Automatic activation remains unavailable/
);
assert.match(
  spanishRuntime.rssImportActivationApprovalBoundary,
  /entrega manual[\s\S]+activación automática no está disponible/
);
assert.match(
  englishWorkbench.overview.importPlansZeroCopy,
  /never copies audio, creates an episode, changes a redirect, or contacts/
);
assert.match(
  spanishWorkbench.overview.importPlansZeroCopy,
  /nunca copia audio, crea un episodio, cambia una redirección ni contacta/
);
assert.match(
  adminMockApi,
  /dustwave-rss-import-preview-v1/
);
assert.match(
  adminMockApi,
  /podcastGuid: show\.podcastGuid[\s\S]+podcastGuidStatus: "valid"/,
  "Browser QA must exercise a matching immutable channel identity"
);
assert.match(
  adminMockApi,
  /rss-import\/podcast-guid[\s\S]+importMutationPerformed: false[\s\S]+publicationMutationPerformed: false/,
  "Browser QA must retain the one-time identity boundary's zero-mutation flags"
);
assert.match(
  adminMockApi,
  /mediaCopyPerformed: false[\s\S]+episodeMutationPerformed: false/
);
assert.match(
  adminMockApi,
  /rss-import\\\/plans\\\/\(\[A-Za-z0-9_-\]\+\)\\\/execution/
);
assert.match(
  adminMockApi,
  /rss-import\\\/plans\\\/\(\[A-Za-z0-9_-\]\+\)\\\/reconciliation/
);
assert.match(
  adminMockApi,
  /rss-import\\\/plans\\\/\(\[A-Za-z0-9_-\]\+\)\\\/redirect-attestation/
);
assert.match(
  adminMockApi,
  /rss-import\\\/plans\\\/\(\[A-Za-z0-9_-\]\+\)\\\/cutover-packet/
);
assert.match(
  adminMockApi,
  /rss-import\\\/plans\\\/\(\[A-Za-z0-9_-\]\+\)\\\/redirect-activation-approval/
);
assert.match(
  adminMockApi,
  /executionAvailable: true[\s\S]+publicationMutationPerformed: false[\s\S]+redirectMutationPerformed: false[\s\S]+providerContactPerformed: false/
);
assert.match(
  adminMockApi,
  /reconciliationAvailable: true[\s\S]+activationAvailable: false[\s\S]+ownerRedirectAttested: Boolean/
);
assert.match(
  adminMockApi,
  /r2MutationPerformed: false[\s\S]+episodeMutationPerformed: false[\s\S]+publicationMutationPerformed: false[\s\S]+redirectMutationPerformed: false[\s\S]+providerContactPerformed: false/
);
assert.match(
  adminMockApi,
  /redirectAttestationMutationPerformed: false/
);
assert.match(
  adminMockApi,
  /cutoverPacketMutationPerformed: false/
);
assert.match(
  adminMockApi,
  /redirectActivationApprovalMutationPerformed: false/
);
assert.doesNotMatch(
  rssImportScript,
  /innerHTML/,
  "Untrusted RSS preview content must use DOM text nodes"
);
assert.match(
  catalogScript,
  /localizedCode\("showStatus", show\.status\)/
);
assert.match(
  catalogScript,
  /localizedCode\("episodeStatus", episode\.status\)/
);
assert.match(
  catalogScript,
  /localizedCode\("episodeAccess", episode\.access\)/
);
assert.match(
  catalogScript,
  /localizedCode\("mediaStatus", episode\.mediaStatus\)/
);
assert.match(
  catalogScript,
  /localizedCode\("language", episode\.sourceLanguage \|\| "not_set"\)/
);
assert.match(
  catalogScript,
  /<a class="btn btn-outline-light" href="\$\{escapeAttribute\(show\.canonicalUrl\)\}">/,
  'The standalone canonical show-page action must retain the shared 44px control target'
);
assert.match(catalogScript, /data-edit-episode=/);
assert.match(adminScript, /renderShowCatalog\(\{/);
assert.match(adminScript, /renderEpisodeCatalog\(\{/);
assert.match(adminScript, /mountEpisodeEditor\(\{/);
assert.match(adminScript, /canEdit: canManageCreatives/);
assert.match(
  episodeEditorScript,
  /findEditableEpisode\(episodes, episodeId\)/
);
assert.match(
  episodeEditorScript,
  /method: updating \? "PATCH" : "POST"/
);
assert.match(
  episodeEditorScript,
  /includeSlug: !updating/,
  'Episode updates must never mutate the canonical URL slug'
);
assert.match(
  episodeEditorScript,
  /notesEditor\.setHtml\(episode\.contentHtml \|\| ""\)/,
  'Stored episode notes must re-enter the shared sanitized editor boundary'
);
assert.doesNotMatch(
  episodeEditorScript,
  /innerHTML|localStorage|sessionStorage/,
  'Episode editing must not bypass the shared sanitizer or persist drafts locally'
);
assert.match(
  adminMockApi,
  /method === "PATCH"[\s\S]+\/v1\/admin\/episodes\/\$\{episode\.id\}/
);
for (const runtime of [englishRuntime, spanishRuntime]) {
  for (const key of [
    'newEpisode',
    'createDraft',
    'editEpisode',
    'updateDraft',
    'updatingDraft',
    'draftUpdated',
    'editingEpisode',
    'episodeEditCanceled'
  ]) {
    assert.equal(
      typeof runtime[key],
      'string',
      `Podcast episode editor translation is missing: ${key}`
    );
  }
}
assert.equal(spanishRuntime.showStatus_active, "Activo");
assert.equal(spanishRuntime.episodeStatus_draft, "Borrador");
assert.equal(spanishRuntime.episodeAccess_early_access, "Acceso anticipado");
assert.equal(spanishRuntime.mediaStatus_processing, "Procesando");
assert.equal(spanishRuntime.language_es, "Español");
assert.match(adminTemplate, /data-podcast-ad-plan-form/);
assert.match(adminTemplate, /data-podcast-ad-plan-result/);
assert.match(adminTemplate, /data-podcast-distribution/);
assert.match(adminTemplate, /data-podcast-billing-refresh/);
assert.match(adminTemplate, /data-podcast-billing-export/);
assert.match(adminTemplate, /data-podcast-billing-status/);
assert.match(adminTemplate, /data-podcast-analytics-range/);
assert.match(adminTemplate, /data-podcast-qualified-downloads/);
assert.match(adminTemplate, /data-podcast-engaged-plays/);
assert.match(adminTemplate, /data-podcast-premium-listeners/);
assert.match(adminTemplate, /data-podcast-analytics-trend/);
assert.match(adminTemplate, /data-podcast-analytics-episodes/);
assert.match(adminTemplate, /data-podcast-web-player-completion/);
assert.match(adminTemplate, /data-podcast-analytics-apps/);
assert.match(analyticsScript, /\/analytics\/overview\?days=/);
assert.match(analyticsScript, /\/analytics\/overview\.csv\?days=/);
assert.doesNotMatch(analyticsScript, /innerHTML/);
assert.match(adminTemplate, /data-podcast-workspace-group="subscribers"/);
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
  adminTemplate,
  /<details class="podcast-admin__advanced-tools podcast-admin__distribution-guidance">[\s\S]+workbench\.distribution\.guidanceSummary[\s\S]+workbench\.distribution\.canonicalFlow[\s\S]+<\/details>/,
  'Distribution operating detail must remain available without overwhelming the default view'
);
assert.match(
  englishWorkbench.distribution.guidanceIntro,
  /one-time provider setup and evidence requirements/
);
assert.match(
  spanishWorkbench.distribution.guidanceIntro,
  /configuración inicial y los requisitos de evidencia/
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
assert.match(adminTemplate, /data-podcast-workspace-group="production"/);
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
assert.match(adminTemplate, /data-podcast-audio-derivatives/);
assert.match(adminTemplate, /data-podcast-audio-derivative-results/);
assert.match(adminTemplate, /data-podcast-delivery-audio/);
assert.match(adminTemplate, /data-podcast-delivery-audio-queue/);
assert.match(adminTemplate, /data-podcast-delivery-audio-results/);
assert.match(englishWorkbenchText, /An enhancement preview is never a master/);
assert.match(englishWorkbenchText, /Replacing an approved master makes transcript, chapter, clip, and readiness approvals stale/);
assert.match(
  englishWorkbenchText,
  /renderer cannot replace the working master/
);
assert.match(
  englishWorkbenchText,
  /validates every complete MP3 frame/
);
assert.match(adminTemplate, /data-podcast-transcript-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-workbench/);
assert.match(adminTemplate, /data-podcast-transcription-queue/);
assert.match(englishWorkbenchText, /Source-language transcription/);
assert.match(adminTemplate, /name="sourceLanguage"/);
assert.match(adminTemplate, /data-podcast-transcript-cues/);
assert.match(adminTemplate, /data-podcast-transcript-pages/);
assert.match(adminTemplate, /data-podcast-transcript-diagnostics/);
assert.match(adminTemplate, /data-podcast-transcript-diagnostics-list/);
assert.match(adminTemplate, /data-podcast-transcript-speaker-range/);
assert.match(adminTemplate, /data-podcast-transcript-speaker-range-start/);
assert.match(adminTemplate, /data-podcast-transcript-speaker-range-end/);
assert.match(adminTemplate, /data-podcast-transcript-speaker-range-label/);
assert.match(
  englishWorkbenchText,
  /Caption text and timing stay unchanged/
);
assert.match(
  adminScript,
  /renderTranscriptReviewDiagnostics\(root, cues, adminText, openTranscriptCue\)/
);
assert.match(
  adminScript,
  /dataset\.transcriptCueNumber = String\(index \+ 1\)/
);
assert.match(
  transcriptSpeakerRangeScript,
  /applyTranscriptSpeakerRange\([\s\S]+new Event\("input", \{ bubbles: true \}\)/
);
assert.match(
  transcriptDiagnosticsScript,
  /minimumCueDurationMs:\s*500[\s\S]+maximumCueDurationMs:\s*10_000/
);
assert.match(
  transcriptDiagnosticsScript,
  /changedCueCount[\s\S]+speakerLabel[\s\S]+speakerConfirmed/
);
assert.match(
  transcriptDiagnosticsScript,
  /maximumCharactersPerSecond:\s*25/
);
assert.match(
  transcriptDiagnosticNavigationScript,
  /role", "group"[\s\S]+aria-labelledby/
);
assert.match(
  transcriptDiagnosticNavigationScript,
  /stepTranscriptDiagnosticPosition[\s\S]+onOpenCue\(update\(\)\)/
);
assert.match(
  adminStyles,
  /podcast-admin__transcript-diagnostic-button[\s\S]+min-height:\s*2\.75rem/
);
assert.match(
  adminMockApi,
  /PODCAST_ADMIN_MOCK_TRANSCRIPT_CUES[\s\S]+maximum:\s*10_000[\s\S]+transcriptFixture/,
  "browser QA must provide a bounded opt-in large-transcript fixture"
);
assert.match(
  adminMockApi,
  /PODCAST_ADMIN_MOCK_PUBLIC_CLIPS[\s\S]+ready[\s\S]+empty[\s\S]+missing/,
  "browser QA must provide controlled public clip visibility states"
);
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
assert.match(adminTemplate, /data-podcast-clip-publication-form/);
assert.match(adminTemplate, /data-podcast-clip-publication-save/);
assert.match(adminTemplate, /data-podcast-clip-publication-approve/);
assert.match(adminTemplate, /data-podcast-clip-publication-withdraw/);
assert.match(englishWorkbenchText, /Staging preview only/);
assert.match(englishWorkbenchText, /production clip delivery remains disabled/);
assert.match(adminTemplate, /data-podcast-clip-youtube-form/);
assert.match(adminTemplate, /data-podcast-clip-youtube-approve/);
assert.match(englishWorkbenchText, /Never public/);
assert.match(englishWorkbenchText, /recently authenticated super-admin/);
assert.match(adminTemplate, /data-podcast-marketing-link-form/);
assert.match(adminTemplate, /data-podcast-marketing-qr/);
assert.match(adminTemplate, /data-podcast-marketing-save/);
assert.match(adminTemplate, /data-podcast-marketing-links/);
assert.match(adminTemplate, /data-podcast-marketing-links-more/);
assert.match(englishWorkbenchText, /Reusable, show-scoped links/);
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
assert.match(adminTemplate, /data-podcast-workspace-group="sponsors"/);
assert.match(adminTemplate, /data-podcast-workspace-group="analytics"/);
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
assert.match(analyticsScript, /\/v1\/admin\/ads\/reconciliation/);
assert.match(adminScript, /\/v1\/admin\/billing\/readiness/);
assert.match(adminScript, /\/v1\/admin\/billing\/tax-evidence/);
assert.match(adminScript, /\/v1\/admin\/subscribers/);
assert.match(
  marketingLinksScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\(show\.id\)\}\/marketing\/links/
);
assert.match(marketingLinksScript, /function safeSavedUrl/);
assert.match(marketingLinksScript, /listRoot\.replaceChildren/);
assert.doesNotMatch(
  marketingLinksScript,
  /listRoot\.innerHTML/,
  'Saved marketing links must render provider-backed fields through DOM text nodes'
);
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
  /\.podcast-admin__status\[data-podcast-global-status\]:empty[\s\S]+display: block/,
  'Admin must reserve the session-status row to prevent authentication CLS'
);
assert.match(
  adminStyles,
  /@media \(max-width: 22\.8125rem\)[\s\S]+\.podcast-admin__turnstile[\s\S]+min-height: 8\.75rem/
);
assert.match(
  adminStyles,
  /@media \(max-width: 24\.5625rem\)[\s\S]+\.podcast-member__turnstile[\s\S]+min-height: 8\.75rem/
);
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
  /\.podcast-admin__panel[\s\S]+> :not\(\.podcast-admin__progressive-section\)[\s\S]+\+ \.podcast-admin__progressive-section \{[\s\S]+margin-top: var\(--dw-admin-section-gap\);/,
  'Podcast Admin disclosures must preserve section spacing after non-disclosure content'
);
assert.match(
  adminStyles,
  /\.podcast-admin label \{[\s\S]+gap: var\(--dw-admin-field-gap\);[\s\S]+margin: 0;/,
  'Podcast Admin labels must not add margins inside already-gapped grids'
);
assert.match(
  adminStyles,
  /\.podcast-admin__field-grid \{[\s\S]+grid-template-columns: minmax\(0, 1fr\);[\s\S]+@media \(min-width: 48rem\) \{[\s\S]+\.podcast-admin__field-grid,[\s\S]+grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
  'Podcast Admin field grids must use one predictable mobile column and at most two default desktop columns'
);
assert.match(
  adminStyles,
  /@media \(min-width: 64rem\) \{[\s\S]+\.podcast-admin__field-grid--three \{[\s\S]+grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
  'Explicit compact field groups may use three columns only when enough width is available'
);
assert.match(
  adminStyles,
  /\.podcast-admin__field-group \{[\s\S]+gap: var\(--dw-admin-grid-row-gap\);[\s\S]+\.podcast-admin__field-group \+ \.podcast-admin__field-group,[\s\S]+border-top:/,
  'Long Podcast Admin forms must use the shared grouped-field rhythm'
);
assert.match(
  adminTemplate,
  /workbench\.episodes\.copyGroup[\s\S]+workbench\.episodes\.releaseGroup[\s\S]+workbench\.sponsors\.identityGroup[\s\S]+workbench\.sponsors\.commercialGroup[\s\S]+workbench\.overview\.identityGroup[\s\S]+workbench\.overview\.releaseDefaultsGroup/,
  'Episode, sponsor, and show forms must expose clear semantic field groups'
);
assert.match(
  adminStyles,
  /\.dw-admin-workflow__list \{[\s\S]+grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[\s\S]+@media \(max-width: 40rem\) \{[\s\S]+\.dw-admin-workflow__list \{[\s\S]+grid-template-columns: minmax\(0, 1fr\);/,
  'The episode workflow must preserve readable three-, two-, and one-column states'
);
assert.match(
  adminStyles,
  /\.podcast-admin__episode-context \{[\s\S]+grid-template-columns: minmax\(0, 1fr\) minmax\(15rem, 24rem\);[\s\S]+@media \(max-width: 47\.9375rem\) \{[\s\S]+\.podcast-admin__episode-context \{[\s\S]+grid-template-columns: minmax\(0, 1fr\);[\s\S]+position: static;/,
  'Current episode context must stay bounded and become one non-sticky mobile column'
);
assert.match(
  adminStyles,
  /\.podcast-admin__show-context \{[\s\S]+min-width: 0;[\s\S]+\.podcast-admin__show-context select \{[\s\S]+width: 100%;[\s\S]+@media \(max-width: 760px\)[\s\S]+\.podcast-admin__panel-heading > \.podcast-admin__show-context[\s\S]+width: 100%;/,
  'show context must remain bounded and fill the available mobile heading width'
);
assert.match(
  adminStyles,
  /\.podcast-admin__workspace-content \{[\s\S]+grid-template-columns: minmax\(0, 1fr\);[\s\S]+min-width: 0;/,
  'Nested admin workspaces must constrain intrinsic field widths instead of clipping narrow-screen content'
);
assert.match(
  adminStyles,
  /\.podcast-admin__option-grid \{[\s\S]+repeat\(auto-fit, minmax\(min\(100%, 15rem\), 1fr\)\)/,
  'Related show policy toggles must share one responsive option-grid primitive'
);
assert.match(
  adminStyles,
  /@media \(max-width: 30rem\) \{[\s\S]+\.podcast-admin__progressive-body \{[\s\S]+var\(--dw-admin-space-xs\)[\s\S]+\.podcast-admin__progressive-body \.podcast-admin__form \{[\s\S]+padding: var\(--dw-admin-space-sm\);/,
  'Nested technical forms must recover usable field width on small screens'
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
  adminScript,
  /responsiveSelect:\s*\{\s*id: "podcast-admin-mobile-tabs"\s*\}/,
  'Podcast Admin must use the shared responsive tab-select controller'
);
assert.match(
  adminStyles,
  /@media \(max-width: 56\.25rem\) \{[\s\S]+\.podcast-admin__tab-list \{[\s\S]+display: none;[\s\S]+\.dw-admin-mobile-tabs \{[\s\S]+display: grid;/,
  'Long Podcast Admin tabs must become a labeled native select on narrow screens'
);
assert.match(
  adminTemplate,
  /<div class="podcast-admin__field">[\s\S]+workbench\.episodes\.notes[\s\S]+data-podcast-notes-editor/,
  'Standalone rich-text labels and editors must share one field wrapper'
);
assert.match(
  adminStyles,
  /\.podcast-admin__form-actions \{[\s\S]+gap: var\(--dw-admin-space-sm\);/,
  'Episode create/edit actions must keep the shared Pool/Store spacing rhythm'
);
assert.match(
  adminStyles,
  /@media \(max-width: 760px\)[\s\S]+\.podcast-admin__form-actions \.btn/,
  'Episode create/edit actions must expand to touch-friendly mobile controls'
);
assert.match(adminScript, /\/v1\/admin\/distribution\?showId=/);
assert.match(adminScript, /function renderDistribution/);
assert.match(
  distributionCertificationScript,
  /function renderDistributionLaunchClaim/
);
assert.match(
  distributionCertificationScript,
  /function distributionCertificationList/
);
assert.match(distributionCertificationScript, /requiredDestinations/);
assert.match(distributionCertificationScript, /failureRecoveryVerified/);
assert.match(
  distributionDisclosureScript,
  /firstActionable[\s\S]+destination\?\.enabled[\s\S]+!destination\?\.certification\?\.certified/,
  'Distribution should initially disclose only the first actionable directory'
);
assert.match(
  distributionDisclosureScript,
  /expandedByShow[\s\S]+openDestinationIds[\s\S]+addEventListener\("toggle"/,
  'Distribution disclosure choices must persist by show across rerenders'
);
assert.match(
  adminStyles,
  /\.podcast-admin__directory-card > summary \{[\s\S]+grid-template-columns: minmax\(0, 1fr\) 2\.25rem;/,
  'Directory summaries must reserve responsive space for their disclosure control'
);
assert.match(
  adminStyles,
  /\.podcast-admin__distribution-form-link \{[\s\S]+grid-column: span 2;/,
  'Directory evidence URLs must share balanced desktop rows'
);
assert.match(
  adminStyles,
  /@media \(max-width: 56\.25rem\)[\s\S]+\.podcast-admin__distribution-form \{[\s\S]+repeat\(2, minmax\(0, 1fr\)\)/,
  'Directory forms must use an intermediate two-column tablet layout'
);
assert.match(
  distributionCertificationScript,
  /feed\.status === "valid" && feed\.currentValidator === false/,
  'A legacy valid feed result must render as stale instead of launch-ready'
);
assert.match(
  distributionCertificationScript,
  /data\.podcastFeedValidationRetry|podcastFeedValidationRetry/,
  'Feed validation recovery must remain available in the launch claim'
);
assert.match(
  adminScript,
  /\/v1\/admin\/shows\/\$\{encodeURIComponent\([\s\S]+\/feed-validation/,
  'Feed validation recovery must use the show-scoped admin endpoint'
);
assert.match(englishRuntime.feedValidationStale, /older validation contract/);
assert.match(
  spanishRuntime.feedValidationStale,
  /contrato de validación anterior/
);
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
assert.match(
  adminStyles,
  /\.podcast-admin__certification-list li \{[\s\S]+display: flex;[\s\S]+gap: var\(--dw-admin-space-sm\);/
);
assert.match(
  adminStyles,
  /\.podcast-admin :is\(ol, ul\) > li \{[\s\S]+margin-inline: 0 !important;/,
  'Admin list items must not inherit the public theme one-sided indentation'
);
assert.match(
  adminStyles,
  /@media \(max-width: 760px\) \{[\s\S]+\.podcast-admin__certification-list li \{[\s\S]+flex-direction: column;/
);
assert.match(
  englishRuntimeText,
  /Owner verification[\s\S]+Canonical feed validation[\s\S]+Failure recovery verified/
);
assert.match(
  JSON.stringify(spanishRuntime),
  /Verificación del propietario[\s\S]+Validación del feed canónico[\s\S]+Recuperación ante fallos verificada/
);
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
assert.match(
  adminScript,
  /audioMasterState = payload;\s+setStatus\(audioMasterApprovalStatus, ""\);\s+setStatus\(audioEnhancementStatus, ""\);/
);
assert.match(adminScript, /function approveSourceWorkingMaster/);
assert.match(adminScript, /function queueAudioEnhancementPreview/);
assert.match(
  adminScript,
  /audio-master\/approve-source/
);
assert.match(adminScript, /audio-enhancement-previews/);
assert.match(audioDerivativeScript, /audio-enhancement-derivatives/);
assert.match(audioDerivativeScript, /async function queue/);
assert.match(audioDerivativeScript, /async function approve/);
assert.match(englishRuntimeText, /exact output bytes/);
assert.match(adminScript, /baseRevision: Number\(state\.revision/);
assert.match(adminScript, /acknowledgeExactSource/);
assert.match(adminScript, /DWDigestAudio\?\.mount/);
assert.match(adminScript, /audio\.crossOrigin = "use-credentials"/);
assert.match(adminScript, /function checkedPrivatePodcastMediaUrl/);
assert.match(
  adminScript,
  /mediaUrl\.origin !== apiBase\.origin/
);
assert.match(
  adminScript,
  /audio-enhancements\\\/\[A-Za-z0-9_-\]\+\\\/media/
);
assert.match(
  adminScript,
  /audio-enhancement-derivatives\\\/\[A-Za-z0-9_-\]\+\\\/media/
);
assert.match(
  adminScript,
  /delivery-audio-jobs\\\/\[A-Za-z0-9_-\]\+\\\/peaks/
);
assert.match(deliveryAudioScript, /delivery-audio-jobs/);
assert.match(deliveryAudioScript, /workingMasterId: currentMaster\.id/);
assert.match(deliveryAudioScript, /contract: "deliveryAudio"/);
assert.match(deliveryAudioScript, /async function approve/);
assert.match(deliveryAudioScript, /exactDeliveryAudioAck/);
assert.match(deliveryAudioScript, /form\.reportValidity\(\)/);
assert.match(deliveryAudioScript, /acknowledgeExactDeliveryAudio/);
assert.match(
  deliveryAudioApprovalScript,
  /jobEpisodeId !== episodeId/
);
assert.match(
  deliveryAudioApprovalScript,
  /sourceMasterId !== masterId/
);
assert.match(adminStyles, /\[data-podcast-delivery-audio-queue\]/);
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
assert.match(
  adminScript,
  /nodeDescription: \(node\) => readinessNodeSummary\(adminText, node\)/
);
assert.match(readinessCopyScript, /export function readinessNodeLabel/);
assert.match(readinessCopyScript, /export function readinessNodeSummary/);
assert.match(readinessCopyScript, /`readinessSummary_\$\{status\}`/);
assert.match(adminScript, /localizedCode\("readinessStatus", status\)/);
assert.match(adminScript, /localizedCode\("readinessSeverity", severity\)/);
assert.match(adminScript, /publicationGateMode/);
assert.match(publicationScript, /PUBLISH_WITH_BLOCKERS/);
assert.match(publicationScript, /publication_override/);
assert.match(publicationScript, /basePublicationRevision/);
assert.match(publicationScript, /mode === "enforce"/);
assert.match(publicationScript, /mode === "shadow"/);
assert.match(
  requestSecurityScript,
  /UNSAFE_ADMIN_TEXT[\s\S]+normalizeAdminReason/,
  "publication overrides must reject control and bidirectional text before the API call"
);
assert.match(publicationSecurityScript, /normalizeAdminReason/);
assert.match(
  publicationScript,
  /normalizePublicationOverrideReason[\s\S]+publication_override_reason_invalid/,
  "the publication coordinator must fail closed on an unsafe override reason"
);
assert.doesNotMatch(
  publicationScript,
  /dust-wave-admin-shell\/api-client/,
  "the publication coordinator must remain source-testable through API-error injection"
);
assert.match(
  adminScript,
  /createEpisodePublisher\(\{[\s\S]+ApiError: AdminApiError/,
  "Podcast Admin must inject its existing localized API error type"
);
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
assert.match(adminConstantsScript, /process-transcription-chunks\.yml/);
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
assert.match(adminConstantsScript, /process-alignment\.yml/);
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
assert.match(adminConstantsScript, /TRANSCRIPT_CUES_PER_PAGE = 10/);
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
assert.match(adminScript, /clip-publications/);
assert.match(adminScript, /data-podcast-clip-publication-open/);
assert.match(clipPublicationScript, /mountClipPublications/);
assert.match(clipPublicationScript, /async function saveDraft/);
assert.match(clipPublicationScript, /async function approve/);
assert.match(clipPublicationScript, /async function withdraw/);
assert.match(clipPublicationScript, /clip-publications/);
assert.match(clipPublicationScript, /expectedClipRevision/);
assert.match(adminMockApi, /clip_publication_browser_fixture/);
assert.match(adminMockApi, /clip-renders\/\$\{clip\.render\.id\}\/publication/);
assert.match(adminMockApi, /clip-publications\/clip_publication_browser_fixture\/approve/);
assert.match(adminMockApi, /clip-publications\/clip_publication_browser_fixture\/withdraw/);
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
assert.match(
  adminTemplate,
  /data-podcast-youtube-audio-episode/
);
assert.match(
  youtubeAudioRenditionScript,
  /\/youtube-audio-renditions/
);
assert.match(
  youtubeAudioRenditionScript,
  /expectedWorkingMasterId/
);
assert.match(
  youtubeAudioRenditionScript,
  /process-youtube-audio-rendition\.yml/
);
assert.match(
  youtubeAudioRenditionScript,
  /createRetriableOperationId/
);
assert.match(
  deliveryAudioScript,
  /createRetriableOperationId/
);
assert.match(adminScript, /youtubeAudio\.reset\(\)/);
assert.doesNotMatch(
  youtubeAudioRenditionScript,
  /(?:localStorage|sessionStorage)/
);
assert.doesNotMatch(
  youtubeAudioRenditionScript,
  /podcast-tab-production/
);
assert.match(
  workspaceScript,
  /episodes:\s*\["production"\][\s\S]+audience:\s*\["analytics", "subscribers"\][\s\S]+monetization:\s*\["sponsors", "billing"\]/
);
assert.match(
  adminScript,
  /production\(\) \{[\s\S]*youtubeAudio\.refresh\(\)/
);
assert.match(
  adminMockApi,
  /youtube-audio-renditions/
);
assert.match(
  adminMockApi,
  /qa-youtube-audio-injection/
);
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
assert.match(sharedPackage.version, /^\d+\.\d+\.\d+$/);
const sharedConsumerImports = [
  adminScript,
  analyticsScript,
  unsavedChangesScript
].flatMap(
  (source) => [...source.matchAll(
    /from "\.\/dust-wave-admin-shell\/([^"]+)"/g
  )].map((match) => match[1])
);
assert(sharedConsumerImports.length > 0);
const escapedSharedVersion = sharedAdminShellVersion.replace(
  /[.*+?^${}()|[\]\\]/g,
  '\\$&'
);
for (const specifier of sharedConsumerImports) {
  assert.match(
    specifier,
    new RegExp(`\\.js\\?v=${escapedSharedVersion}$`),
    `Shared Admin Shell imports must use the exact package cache key: ${specifier}`
  );
}

const sharedSources = [
  'api-client.js',
  'credentialed-download.js',
  'editor.js',
  'editor-codec.js',
  'marketing-assets.js',
  'passwordless-session.js',
  'tabs.js',
  'turnstile.js'
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
await access(path.join(sharedRoot, 'src', 'unsaved-changes.js'));
await access(path.join(sharedRoot, 'src', 'unsaved-changes-browser.js'));
assert.match(
  unsavedChangesScript,
  /dust-wave-admin-shell\/unsaved-changes\.js/
);
for (const source of sharedSources.filter((source) => source !== 'editor-codec.js')) {
  assert.match(
    adminScript,
    new RegExp(`dust-wave-admin-shell/${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  );
}

console.log('Validated the shared, fail-closed Podcast admin shell contract.');
