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
const youtubeAudioRenditionScript = await readFile(
  path.join(
    repositoryRoot,
    'src/js/podcast-admin-youtube-audio-renditions.js'
  ),
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
const staticRuntimeKeys = [
  ...adminScript.matchAll(/adminText\(\s*"([^"]+)"/g),
  ...distributionCertificationScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...audioDerivativeScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...analyticsScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...marketingLinksScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...catalogScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...rssImportReconciliationScript.matchAll(/text\(\s*"([^"]+)"/g),
  ...youtubeAudioRenditionScript.matchAll(/text\(\s*"([^"]+)"/g)
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
  /function loadTurnstile\(\) \{[\s\S]+document\.head\.append\(script\);/,
  'The login surface must load Turnstile on demand'
);
assert.match(adminConfig, /require\("\.\/podcastApi\.js"\)\.apiOrigin/);
assert.match(podcastApiConfig, /https:\/\/feeds\.dustwave\.xyz/);
assert.doesNotMatch(adminConfig, /workers\.dev/);
assert.doesNotMatch(podcastApiConfig, /workers\.dev/);
assert.match(adminTemplate, /data-podcast-auth/);
assert.match(adminTemplate, /data-podcast-episode-form/);
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
assert.match(adminScript, /renderShowCatalog\(\{/);
assert.match(adminScript, /renderEpisodeCatalog\(\{/);
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
assert.match(adminScript, /function localizedReadinessNodeLabel/);
assert.match(adminScript, /`readinessSummary_\$\{status\}`/);
assert.match(adminScript, /localizedCode\("readinessStatus", status\)/);
assert.match(adminScript, /localizedCode\("readinessSeverity", severity\)/);
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
assert.doesNotMatch(
  youtubeAudioRenditionScript,
  /(?:localStorage|sessionStorage)/
);
assert.doesNotMatch(
  youtubeAudioRenditionScript,
  /podcast-tab-production/
);
assert.match(
  adminScript,
  /if \(tab === "production"\) \{[\s\S]*youtubeAudioRenditions\.refresh\(\)/
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
const sharedConsumerImports = [adminScript, analyticsScript].flatMap(
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
for (const source of sharedSources.filter((source) => source !== 'editor-codec.js')) {
  assert.match(
    adminScript,
    new RegExp(`dust-wave-admin-shell/${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  );
}

console.log('Validated the shared, fail-closed Podcast admin shell contract.');
