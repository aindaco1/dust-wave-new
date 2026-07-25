import { AdminApiClient, AdminApiError } from "./dust-wave-admin-shell/api-client.js";
import { mountRichTextEditor } from "./dust-wave-admin-shell/editor.js";
import {
  markdownToEditorHtml
} from "./dust-wave-admin-shell/editor-codec.js";
import {
  buildTaggedMarketingUrl,
  createMarketingQr,
  drawQrCanvas,
  qrSvgMarkup,
  safeMarketingFilename
} from "./dust-wave-admin-shell/marketing-assets.js";
import { PasswordlessAdminSession } from "./dust-wave-admin-shell/passwordless-session.js";
import { mountAccessibleTabs } from "./dust-wave-admin-shell/tabs.js";

const TRANSCRIPT_CUES_PER_PAGE = 100;

const root = document.querySelector("[data-podcast-admin]");
if (root) startPodcastAdmin(root);

function startPodcastAdmin(root) {
  const apiOrigin = root.dataset.apiOrigin;
  const client = new AdminApiClient({
    baseUrl: apiOrigin,
    csrfHeader: "x-podcast-csrf"
  });
  const session = new PasswordlessAdminSession({ client });
  const authPanel = root.querySelector("[data-podcast-auth]");
  const app = root.querySelector("[data-podcast-app]");
  const logoutButton = root.querySelector("[data-podcast-logout]");
  const globalStatus = root.querySelector("[data-podcast-global-status]");
  const authStatus = root.querySelector("[data-podcast-auth-status]");
  const showCards = root.querySelector("[data-podcast-show-cards]");
  const showForm = root.querySelector("[data-podcast-show-form]");
  const showStatus = root.querySelector("[data-podcast-show-status]");
  const showSelect = root.querySelector("[data-podcast-show-select]");
  const episodeForm = root.querySelector("[data-podcast-episode-form]");
  const episodeStatus = root.querySelector("[data-podcast-episode-status]");
  const episodeList = root.querySelector("[data-podcast-episode-list]");
  const uploadForm = root.querySelector("[data-podcast-upload-form]");
  const uploadStatus = root.querySelector("[data-podcast-upload-status]");
  const uploadProgress = root.querySelector("[data-podcast-upload-progress]");
  const transcriptWorkbench = root.querySelector(
    "[data-podcast-transcript-workbench]"
  );
  const transcriptEpisodeSelect = root.querySelector(
    "[data-podcast-transcript-episode]"
  );
  const transcriptLanguageSelect = root.querySelector(
    "[data-podcast-transcript-language]"
  );
  const transcriptMeta = root.querySelector("[data-podcast-transcript-meta]");
  const transcriptCuesRoot = root.querySelector(
    "[data-podcast-transcript-cues]"
  );
  const transcriptStatus = root.querySelector(
    "[data-podcast-transcript-status]"
  );
  const transcriptAddButton = root.querySelector(
    "[data-podcast-transcript-add]"
  );
  const transcriptSaveButton = root.querySelector(
    "[data-podcast-transcript-save]"
  );
  const transcriptApproveButton = root.querySelector(
    "[data-podcast-transcript-approve]"
  );
  const transcriptPages = root.querySelector(
    "[data-podcast-transcript-pages]"
  );
  const transcriptPageLabel = root.querySelector(
    "[data-podcast-transcript-page]"
  );
  const transcriptPreviousButton = root.querySelector(
    "[data-podcast-transcript-previous]"
  );
  const transcriptNextButton = root.querySelector(
    "[data-podcast-transcript-next]"
  );
  const chapterWorkbench = root.querySelector(
    "[data-podcast-chapter-workbench]"
  );
  const chapterEpisodeSelect = root.querySelector(
    "[data-podcast-chapter-episode]"
  );
  const chapterMeta = root.querySelector("[data-podcast-chapter-meta]");
  const chapterRowsRoot = root.querySelector("[data-podcast-chapter-rows]");
  const chapterStatus = root.querySelector("[data-podcast-chapter-status]");
  const chapterAddButton = root.querySelector("[data-podcast-chapter-add]");
  const chapterSaveButton = root.querySelector("[data-podcast-chapter-save]");
  const chapterApproveButton = root.querySelector(
    "[data-podcast-chapter-approve]"
  );
  const reviewForm = root.querySelector("[data-podcast-review-form]");
  const reviewEpisodeSelect = root.querySelector(
    "[data-podcast-review-episode]"
  );
  const reviewTargetSelect = root.querySelector(
    "[data-podcast-review-target]"
  );
  const reviewStatus = root.querySelector("[data-podcast-review-status]");
  const reviewReadiness = root.querySelector(
    "[data-podcast-review-readiness]"
  );
  const reviewList = root.querySelector("[data-podcast-review-list]");
  const readinessSummary = root.querySelector(
    "[data-podcast-readiness-summary]"
  );
  const readinessGroups = root.querySelector(
    "[data-podcast-readiness-groups]"
  );
  const readinessStatus = root.querySelector(
    "[data-podcast-readiness-status]"
  );
  const readinessRefresh = root.querySelector(
    "[data-podcast-readiness-refresh]"
  );
  const audioQcEpisodeSelect = root.querySelector(
    "[data-podcast-audio-qc-episode]"
  );
  const audioQcQueue = root.querySelector("[data-podcast-audio-qc-queue]");
  const audioQcRefresh = root.querySelector(
    "[data-podcast-audio-qc-refresh]"
  );
  const audioQcSummary = root.querySelector(
    "[data-podcast-audio-qc-summary]"
  );
  const audioQcResults = root.querySelector(
    "[data-podcast-audio-qc-results]"
  );
  const audioQcStatus = root.querySelector("[data-podcast-audio-qc-status]");
  const clipForm = root.querySelector("[data-podcast-clip-form]");
  const clipPreview = root.querySelector("[data-podcast-clip-preview]");
  const clipStatus = root.querySelector("[data-podcast-clip-status]");
  const clipList = root.querySelector("[data-podcast-clip-list]");
  const clipNewButton = root.querySelector("[data-podcast-clip-new]");
  const clipRenderButton = root.querySelector("[data-podcast-clip-render]");
  const clipLibraryFilters = root.querySelector(
    "[data-podcast-clip-library-filters]"
  );
  const clipLibraryStatus = root.querySelector(
    "[data-podcast-clip-library-status]"
  );
  const clipLibrary = root.querySelector("[data-podcast-clip-library]");
  const clipYouTubeForm = root.querySelector(
    "[data-podcast-clip-youtube-form]"
  );
  const clipYouTubeMeta = root.querySelector(
    "[data-podcast-clip-youtube-meta]"
  );
  const clipYouTubeStatus = root.querySelector(
    "[data-podcast-clip-youtube-status]"
  );
  const clipYouTubeApprove = root.querySelector(
    "[data-podcast-clip-youtube-approve]"
  );
  const marketingLinkForm = root.querySelector(
    "[data-podcast-marketing-link-form]"
  );
  const marketingQr = root.querySelector("[data-podcast-marketing-qr]");
  const marketingPreviewTitle = root.querySelector(
    "[data-podcast-marketing-preview-title]"
  );
  const marketingPreviewUrl = root.querySelector(
    "[data-podcast-marketing-preview-url]"
  );
  const marketingLinkStatus = root.querySelector(
    "[data-podcast-marketing-link-status]"
  );
  const embedForm = root.querySelector("[data-podcast-embed-form]");
  const embedPreview = root.querySelector("[data-podcast-embed-preview]");
  const embedStatus = root.querySelector("[data-podcast-embed-status]");
  const embedCopyButton = root.querySelector("[data-podcast-embed-copy]");
  const embedOpenLink = root.querySelector("[data-podcast-embed-open]");
  const shareCardForm = root.querySelector("[data-podcast-share-card-form]");
  const shareCardPreview = root.querySelector(
    "[data-podcast-share-card-preview]"
  );
  const shareCardStatus = root.querySelector(
    "[data-podcast-share-card-status]"
  );
  const shareCardCopyButton = root.querySelector(
    "[data-podcast-share-card-copy]"
  );
  const shareCardDownloadLink = root.querySelector(
    "[data-podcast-share-card-download]"
  );
  const shareCardOpenLink = root.querySelector(
    "[data-podcast-share-card-open]"
  );
  const announcementForm = root.querySelector(
    "[data-podcast-announcement-form]"
  );
  const announcementStatus = root.querySelector(
    "[data-podcast-announcement-status]"
  );
  const announcementReview = root.querySelector(
    "[data-podcast-announcement-review]"
  );
  const adPlanForm = root.querySelector("[data-podcast-ad-plan-form]");
  const adPlanStatus = root.querySelector("[data-podcast-ad-plan-status]");
  const adPlanResult = root.querySelector("[data-podcast-ad-plan-result]");
  const distributionRoot = root.querySelector("[data-podcast-distribution]");
  const distributionFilter = root.querySelector(
    "[data-podcast-distribution-filter]"
  );
  const billingRoot = root.querySelector("[data-podcast-billing]");
  const sponsorForm = root.querySelector("[data-podcast-sponsor-preview-form]");
  const sponsorStatus = root.querySelector("[data-podcast-sponsor-status]");
  const sponsorResult = root.querySelector("[data-podcast-sponsor-preview-result]");
  const campaignForm = root.querySelector("[data-podcast-campaign-form]");
  const campaignStatus = root.querySelector("[data-podcast-campaign-status]");
  const campaignList = root.querySelector("[data-podcast-campaign-list]");
  const creativeForm = root.querySelector("[data-podcast-creative-form]");
  const creativeStatus = root.querySelector("[data-podcast-creative-status]");
  const creativeProgress = root.querySelector("[data-podcast-creative-progress]");
  const reconciliationRoot = root.querySelector("[data-podcast-reconciliation]");
  const reconciliationStatus = root.querySelector("[data-podcast-reconciliation-status]");
  const reconciliationShow = root.querySelector("[data-podcast-reconciliation-show]");
  const qualifiedSponsorDeliveries = root.querySelector(
    "[data-podcast-qualified-sponsor-deliveries]"
  );
  const reconciliationDifferences = root.querySelector(
    "[data-podcast-reconciliation-differences]"
  );
  const campaignsAtCap = root.querySelector("[data-podcast-campaigns-at-cap]");
  let shows = [];
  let episodes = [];
  let adminIdentity = null;
  let campaigns = [];
  let reconciliationRows = [];
  let reconciliationCursor = null;
  let reconciliationLoading = false;
  let reconciliationRequestId = 0;
  let distributionRequestId = 0;
  let selectedShowId = "";
  let canManageCampaigns = false;
  let canManageCreatives = false;
  let canManageAdPlans = false;
  let canEditTranscripts = false;
  let canApproveTranscripts = false;
  let canEditChapters = false;
  let canApproveChapters = false;
  let canEditReviews = false;
  let canApproveReviews = false;
  let canRunAudioQc = false;
  let canApproveClipYouTube = false;
  let transcript = null;
  let transcriptDurationSeconds = null;
  let transcriptRequestId = 0;
  let transcriptDirty = false;
  let transcriptPage = 0;
  const transcriptEditors = new Map();
  let chapterSet = null;
  let chapterRequestId = 0;
  let chapterDirty = false;
  let productionReviews = null;
  let reviewRequestId = 0;
  let publicationReadiness = null;
  let readinessRequestId = 0;
  let audioQcState = null;
  let audioQcRequestId = 0;
  let clips = [];
  let selectedClipId = "";
  let clipRequestId = 0;
  let clipLibraryRows = [];
  let clipLibraryCursor = null;
  let clipLibraryLoading = false;
  let clipLibraryRequestId = 0;
  let selectedClipYouTube = null;
  let clipYouTubePublicationId = "";
  let marketingTaggedUrl = "";
  let marketingCurrentQr = null;
  let latestProcessorManifest = null;
  let turnstileToken = "";
  let turnstileWidgetId;

  const notesEditor = mountRichTextEditor(
    root.querySelector("[data-podcast-notes-editor]"),
    { label: "Episode notes" }
  );
  const announcementEditor = mountRichTextEditor(
    root.querySelector("[data-podcast-announcement-editor]"),
    {
      label: "Podcast announcement content",
      onChange() {
        announcementReview?.replaceChildren();
        setStatus(announcementStatus, "");
      }
    }
  );
  mountAccessibleTabs(root.querySelector("[data-podcast-tabs]"), {
    storageKey: "dustwave-podcast-admin-tab",
    onSelect(tab) {
      if (tab !== "production") pauseClipMediaPlayers(clipList);
      if (tab !== "marketing") pauseClipMediaPlayers(clipLibrary);
      if (tab === "production") {
        loadAudioQc();
        loadTranscript();
        loadChapters();
        loadProductionReviews();
      }
      if (tab === "distribution") loadDistribution();
      if (tab === "marketing") {
        updateMarketingTools();
        loadClipLibrary({ reset: true });
      }
      if (tab === "billing") loadBilling();
      if (tab === "sponsors") loadCampaigns();
      if (tab === "analytics") loadAdReconciliation({ reset: true });
    }
  });

  root.querySelector("[data-podcast-refresh]")?.addEventListener("click", loadShows);
  root.querySelector("[data-podcast-reconciliation-refresh]")?.addEventListener(
    "click",
    () => loadAdReconciliation({ reset: true })
  );
  distributionRoot?.addEventListener("click", handleDistributionClick);
  distributionRoot?.addEventListener(
    "submit",
    updateDistributionDestination
  );
  distributionRoot?.addEventListener(
    "submit",
    updateDirectoryObservation
  );
  distributionFilter?.elements.episodeId?.addEventListener(
    "change",
    () => loadDistribution()
  );
  root.querySelector("[data-podcast-login-form]")?.addEventListener("submit", startLogin);
  logoutButton?.addEventListener("click", logout);
  showSelect?.addEventListener("change", async () => {
    selectedShowId = showSelect.value;
    if (distributionFilter) {
      distributionFilter.elements.episodeId.value = "";
    }
    closeClipYouTubeForm();
    clearClipLibraryState();
    fillShowForm();
    updateMarketingTools({ showChanged: true });
    await Promise.all([loadEpisodes(), loadCampaigns()]);
    const marketingPanel = root.querySelector("#podcast-panel-marketing");
    if (marketingPanel && !marketingPanel.hidden) {
      await loadClipLibrary({ reset: true });
    }
    const analyticsPanel = root.querySelector("#podcast-panel-analytics");
    if (analyticsPanel && !analyticsPanel.hidden) {
      await loadAdReconciliation({ reset: true });
    }
    const distributionPanel = root.querySelector(
      "#podcast-panel-distribution"
    );
    if (distributionPanel && !distributionPanel.hidden) {
      await loadDistribution();
    }
  });
  showForm?.addEventListener("submit", saveShow);
  episodeForm?.addEventListener("submit", createEpisode);
  episodeForm?.elements.title?.addEventListener("input", () => {
    if (!episodeForm.elements.slug.dataset.edited) {
      episodeForm.elements.slug.value = slugify(episodeForm.elements.title.value);
    }
  });
  episodeForm?.elements.slug?.addEventListener("input", () => {
    episodeForm.elements.slug.dataset.edited = "true";
  });
  uploadForm?.addEventListener("submit", uploadMedia);
  transcriptEpisodeSelect?.addEventListener("change", loadTranscript);
  transcriptLanguageSelect?.addEventListener("change", loadTranscript);
  transcriptAddButton?.addEventListener("click", addTranscriptCue);
  transcriptSaveButton?.addEventListener("click", saveTranscript);
  transcriptApproveButton?.addEventListener("click", approveTranscript);
  transcriptPreviousButton?.addEventListener("click", () =>
    moveTranscriptPage(-1)
  );
  transcriptNextButton?.addEventListener("click", () =>
    moveTranscriptPage(1)
  );
  chapterEpisodeSelect?.addEventListener("change", loadChapters);
  chapterAddButton?.addEventListener("click", addChapter);
  chapterSaveButton?.addEventListener("click", saveChapters);
  chapterApproveButton?.addEventListener("click", approveChapters);
  chapterRowsRoot?.addEventListener("input", markChaptersDirty);
  chapterRowsRoot?.addEventListener("change", markChaptersDirty);
  chapterRowsRoot?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-podcast-chapter-remove]");
    if (button) removeChapter(button.dataset.podcastChapterRemove);
  });
  reviewEpisodeSelect?.addEventListener("change", loadProductionReviews);
  reviewForm?.addEventListener("submit", createProductionReviewComment);
  reviewList?.addEventListener("change", handleProductionReviewChange);
  reviewList?.addEventListener("click", handleProductionReviewClick);
  readinessRefresh?.addEventListener("click", () =>
    loadPublicationReadiness()
  );
  audioQcEpisodeSelect?.addEventListener("change", loadAudioQc);
  audioQcQueue?.addEventListener("click", queueAudioQc);
  audioQcRefresh?.addEventListener("click", loadAudioQc);
  clipForm?.addEventListener("submit", saveClipRecipe);
  clipNewButton?.addEventListener("click", resetClipRecipe);
  clipRenderButton?.addEventListener("click", prepareClipRender);
  clipForm?.elements.startCueId?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipForm?.elements.endCueId?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipForm?.elements.aspectRatio?.addEventListener(
    "change",
    refreshClipRecipe
  );
  clipList?.addEventListener("click", (event) => {
    handleClipAction(event, { editable: true });
  });
  clipLibraryFilters?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadClipLibrary({ reset: true });
  });
  clipLibraryFilters?.addEventListener("change", () => {
    loadClipLibrary({ reset: true });
  });
  clipLibrary?.addEventListener("click", (event) => {
    if (handleClipAction(event)) return;
    if (event.target.closest("[data-podcast-clip-library-more]")) {
      loadClipLibrary({ reset: false });
    }
  });
  clipYouTubeForm?.addEventListener("submit", saveClipYouTubeDraft);
  clipYouTubeApprove?.addEventListener(
    "click",
    approveClipYouTubePublication
  );
  clipYouTubeForm
    ?.querySelector("[data-podcast-clip-youtube-close]")
    ?.addEventListener("click", closeClipYouTubeForm);
  marketingLinkForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    updateMarketingLink();
  });
  marketingLinkForm?.addEventListener("input", updateMarketingLink);
  root.querySelector("[data-podcast-marketing-copy]")?.addEventListener(
    "click",
    copyMarketingLink
  );
  root.querySelector("[data-podcast-marketing-share]")?.addEventListener(
    "click",
    shareMarketingLink
  );
  root.querySelector("[data-podcast-marketing-qr-png]")?.addEventListener(
    "click",
    () => downloadMarketingQr("png")
  );
  root.querySelector("[data-podcast-marketing-qr-svg]")?.addEventListener(
    "click",
    () => downloadMarketingQr("svg")
  );
  embedForm?.addEventListener("submit", (event) => event.preventDefault());
  embedForm?.elements.episodeId?.addEventListener(
    "change",
    updatePodcastEmbed
  );
  embedCopyButton?.addEventListener("click", copyPodcastEmbed);
  shareCardForm?.addEventListener(
    "submit",
    (event) => event.preventDefault()
  );
  shareCardForm?.elements.episodeId?.addEventListener(
    "change",
    updatePodcastShareCard
  );
  shareCardCopyButton?.addEventListener("click", copyPodcastShareCardUrl);
  announcementForm?.addEventListener(
    "submit",
    runAnnouncementDryRun
  );
  announcementForm?.addEventListener("input", () => {
    announcementReview?.replaceChildren();
    setStatus(announcementStatus, "");
  });
  transcriptCuesRoot?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-podcast-transcript-remove]");
    if (remove) removeTranscriptCue(remove.dataset.podcastTranscriptRemove);
  });
  adPlanForm?.addEventListener("submit", submitAdPlan);
  adPlanForm?.elements.episodeId?.addEventListener("change", () => loadAdPlan());
  adPlanForm?.elements.midRoll?.addEventListener("change", updateAdPlanFields);
  adPlanResult?.addEventListener("click", handleAdPlanAction);
  sponsorForm?.addEventListener("submit", previewSponsorDecision);
  campaignForm?.addEventListener("submit", createCampaign);
  campaignForm?.elements.campaignType?.addEventListener(
    "change",
    updateDirectSponsorFields
  );
  creativeForm?.addEventListener("submit", uploadCreative);
  campaignList?.addEventListener("click", handleCampaignAction);
  reconciliationRoot?.addEventListener("click", (event) => {
    if (event.target.closest("[data-podcast-reconciliation-more]")) {
      loadAdReconciliation({ reset: false });
    }
  });
  episodeList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-publish-episode]");
    if (!button) return;
    await publishEpisode(button.dataset.publishEpisode, button);
  });

  initializeTurnstile();
  initializeCampaignForm();
  updateAdPlanFields();
  restoreOrExchange();

  async function restoreOrExchange() {
    setStatus(globalStatus, "Checking your session…");
    try {
      const token = session.tokenFromFragment();
      const result = token ? await session.exchange(token) : await session.restore();
      if (token) session.clearFragment();
      showAuthenticated(result.identity);
      await loadShows();
      setStatus(globalStatus, "");
    } catch (error) {
      showLoggedOut();
      setStatus(globalStatus, error instanceof AdminApiError && error.status === 401
        ? ""
        : friendlyError(error));
    }
  }

  async function startLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus(authStatus, "Sending a secure link…");
    try {
      await session.start({
        email: form.elements.email.value,
        turnstileToken,
        preferredLanguage: document.documentElement.lang || "en"
      });
      setStatus(
        authStatus,
        "If that address is authorized, the sign-in link is on its way. / Si la dirección está autorizada, el enlace está en camino."
      );
    } catch (error) {
      setStatus(authStatus, friendlyError(error), true);
    } finally {
      submit.disabled = false;
      resetTurnstile();
    }
  }

  async function logout() {
    logoutButton.disabled = true;
    try {
      await session.logout();
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    } finally {
      logoutButton.disabled = false;
      showLoggedOut();
    }
  }

  function showAuthenticated(identity) {
    adminIdentity = identity || null;
    authPanel.hidden = true;
    app.hidden = false;
    logoutButton.hidden = false;
    const roles = (identity?.roles || []).map(({ role }) => role.replace("_", " ")).join(", ");
    canManageCampaigns = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
    canManageCreatives = (identity?.roles || []).some(({ role }) =>
      ["super_admin", "admin", "producer"].includes(role)
    );
    canManageAdPlans = canManageCreatives;
    canEditTranscripts = canManageCreatives;
    canEditChapters = canManageCreatives;
    canEditReviews = canManageCreatives;
    canRunAudioQc = canManageCreatives;
    canApproveTranscripts = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
    canApproveChapters = canApproveTranscripts;
    canApproveReviews = canApproveTranscripts;
    canApproveClipYouTube = (identity?.roles || []).some(({ role }) =>
      role === "super_admin"
    );
    campaignForm.hidden = !canManageCampaigns;
    creativeForm.hidden = !canManageCreatives;
    adPlanForm.hidden = !canManageAdPlans;
    root.querySelector("[data-podcast-session-summary]").textContent =
      `Authenticated Podcast administrator${roles ? ` — ${roles}` : ""}.`;
  }

  function showLoggedOut() {
    authPanel.hidden = false;
    app.hidden = true;
    logoutButton.hidden = true;
    shows = [];
    episodes = [];
    adminIdentity = null;
    campaigns = [];
    reconciliationRows = [];
    reconciliationCursor = null;
    reconciliationLoading = false;
    reconciliationRequestId += 1;
    distributionRequestId += 1;
    canManageCampaigns = false;
    canManageCreatives = false;
    canManageAdPlans = false;
    canEditTranscripts = false;
    canApproveTranscripts = false;
    canEditChapters = false;
    canApproveChapters = false;
    canEditReviews = false;
    canApproveReviews = false;
    canRunAudioQc = false;
    canApproveClipYouTube = false;
    transcript = null;
    transcriptDurationSeconds = null;
    transcriptDirty = false;
    transcriptPage = 0;
    transcriptRequestId += 1;
    transcriptEditors.clear();
    transcriptCuesRoot?.replaceChildren();
    transcriptMeta?.replaceChildren();
    if (transcriptPages) transcriptPages.hidden = true;
    setStatus(transcriptStatus, "");
    chapterSet = null;
    chapterDirty = false;
    chapterRequestId += 1;
    chapterRowsRoot?.replaceChildren();
    chapterMeta?.replaceChildren();
    setStatus(chapterStatus, "");
    productionReviews = null;
    reviewRequestId += 1;
    publicationReadiness = null;
    readinessRequestId += 1;
    reviewTargetSelect?.replaceChildren();
    reviewList?.replaceChildren();
    reviewReadiness?.replaceChildren();
    readinessGroups?.replaceChildren();
    if (readinessSummary) readinessSummary.textContent = "";
    setStatus(readinessStatus, "");
    audioQcState = null;
    audioQcRequestId += 1;
    audioQcResults?.replaceChildren();
    if (audioQcSummary) audioQcSummary.textContent = "";
    setStatus(audioQcStatus, "");
    reviewForm?.reset();
    setStatus(reviewStatus, "");
    clips = [];
    selectedClipId = "";
    clipRequestId += 1;
    clipForm?.reset();
    releaseClipMediaPlayers(clipList);
    clipList?.replaceChildren();
    if (clipPreview) clipPreview.textContent = "";
    setStatus(clipStatus, "");
    clearClipLibraryState();
    closeClipYouTubeForm();
    latestProcessorManifest = null;
    sponsorResult?.replaceChildren();
    campaignList?.replaceChildren();
    reconciliationRoot?.replaceChildren();
    setReconciliationMetrics();
    creativeForm?.reset();
    adPlanForm?.reset();
    adPlanResult?.replaceChildren();
  }

  async function loadShows() {
    setStatus(globalStatus, "Loading shows…");
    try {
      const payload = await client.request("/v1/admin/shows");
      shows = payload.shows || [];
      const previousShowId = selectedShowId;
      selectedShowId = shows.some(({ id }) => id === selectedShowId)
        ? selectedShowId
        : shows[0]?.id || "";
      if (selectedShowId !== previousShowId) clearClipLibraryState();
      renderShows();
      fillShowSelect();
      fillShowForm();
      updateMarketingTools({
        showChanged: selectedShowId !== previousShowId
      });
      await Promise.all([loadEpisodes(), loadCampaigns()]);
      const marketingPanel = root.querySelector("#podcast-panel-marketing");
      if (marketingPanel && !marketingPanel.hidden) {
        await loadClipLibrary({ reset: true });
      }
      const analyticsPanel = root.querySelector("#podcast-panel-analytics");
      if (analyticsPanel && !analyticsPanel.hidden) {
        await loadAdReconciliation({ reset: true });
      }
      setStatus(globalStatus, "");
    } catch (error) {
      setStatus(globalStatus, friendlyError(error), true);
    }
  }

  function renderShows() {
    showCards.replaceChildren(...shows.map((show) => {
      const card = document.createElement("article");
      card.className = "podcast-admin__card";
      card.innerHTML = `
        <p class="podcast-admin__pill">${escapeHtml(show.status)}</p>
        <h3>${escapeHtml(show.title)}</h3>
        <p>${escapeHtml(show.description)}</p>
        <dl>
          <div><dt>Episodes</dt><dd>${Number(show.episodeCount || 0)}</dd></div>
          <div><dt>Early access</dt><dd>${show.earlyAccessDays ?? "—"} days</dd></div>
          <div><dt>Premium</dt><dd>${show.premiumEnabled ? "Configured" : "Off"}</dd></div>
        </dl>
        <p><a href="${escapeAttribute(show.canonicalUrl)}">Canonical show page</a></p>`;
      return card;
    }));
  }

  function fillShowSelect() {
    showSelect.replaceChildren(...shows.map((show) =>
      new Option(show.title, show.id, false, show.id === selectedShowId)
    ));
  }

  function fillShowForm() {
    const show = shows.find(({ id }) => id === selectedShowId);
    showForm.hidden = !show;
    if (!show) return;
    for (const field of [
      "title", "description", "descriptionEn", "earlyAccessDays", "youtubeChannelUrl"
    ]) {
      showForm.elements[field].value = show[field] ?? "";
    }
    showForm.elements.premiumEnabled.checked = show.premiumEnabled;
    showForm.elements.freeMiniEpisodeEnabled.checked = show.freeMiniEpisodeEnabled;
  }

  function updateMarketingTools({ showChanged = false } = {}) {
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show) {
      marketingTaggedUrl = "";
      marketingCurrentQr = null;
      marketingQr?.replaceChildren();
      announcementReview?.replaceChildren();
      return;
    }
    if (
      showChanged
      || marketingLinkForm?.dataset.showId !== show.id
    ) {
      marketingLinkForm.dataset.showId = show.id;
      marketingLinkForm.elements.campaign.value = `${show.slug}-launch`;
      marketingLinkForm.elements.content.value = "";
      marketingLinkForm.elements.ref.value = "";
    }
    if (
      showChanged
      || announcementForm?.dataset.showId !== show.id
    ) {
      announcementForm.dataset.showId = show.id;
      const spanish = show.language === "es";
      announcementForm.elements.language.value = spanish ? "es" : "en";
      announcementForm.elements.subject.value = spanish
        ? `Nuevo episodio de ${show.title}`
        : `New episode of ${show.title}`;
      announcementForm.elements.heading.value = show.title;
      announcementForm.elements.ctaLabel.value = spanish
        ? "Escuchar episodio"
        : "Listen to the episode";
      announcementForm.elements.ctaUrl.value = show.canonicalUrl;
      announcementEditor.setValue(
        spanish
          ? `Ya está disponible un nuevo episodio de **${show.title}**.`
          : `A new episode of **${show.title}** is now available.`
      );
      announcementReview.replaceChildren();
      setStatus(announcementStatus, "");
    }
    updateMarketingLink();
  }

  function updateMarketingLink() {
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show || !marketingLinkForm) return;
    try {
      const canonicalOrigin = new URL(show.canonicalUrl).origin;
      marketingTaggedUrl = buildTaggedMarketingUrl({
        canonicalUrl: show.canonicalUrl,
        source: marketingLinkForm.elements.source.value,
        medium: marketingLinkForm.elements.medium.value,
        campaign: marketingLinkForm.elements.campaign.value,
        content: marketingLinkForm.elements.content.value,
        ref: marketingLinkForm.elements.ref.value,
        allowedOrigins: [canonicalOrigin]
      });
      marketingLinkForm.elements.taggedUrl.value = marketingTaggedUrl;
      marketingPreviewTitle.textContent = show.title;
      marketingPreviewUrl.textContent = marketingTaggedUrl;
      renderMarketingQr();
      setStatus(marketingLinkStatus, "");
    } catch (error) {
      marketingTaggedUrl = "";
      marketingCurrentQr = null;
      marketingLinkForm.elements.taggedUrl.value = "";
      marketingQr?.replaceChildren();
      setStatus(
        marketingLinkStatus,
        error instanceof Error
          ? error.message
          : "Unable to build the tagged link.",
        true
      );
    }
  }

  function renderMarketingQr() {
    marketingCurrentQr = null;
    marketingQr?.replaceChildren();
    if (!marketingTaggedUrl || !marketingQr) return;
    try {
      const qr = createMarketingQr(marketingTaggedUrl);
      if (!qr) {
        throw new Error("The shared QR engine is unavailable.");
      }
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute(
        "aria-label",
        `QR code for ${shows.find(({ id }) => id === selectedShowId)?.title || "podcast"}`
      );
      drawQrCanvas(qr, canvas, { cellSize: 8, margin: 4 });
      marketingCurrentQr = qr;
      marketingQr.append(canvas);
    } catch (error) {
      setStatus(
        marketingLinkStatus,
        error instanceof Error
          ? error.message
          : "Unable to render the QR code.",
        true
      );
    }
  }

  async function copyMarketingLink() {
    if (!marketingTaggedUrl) {
      updateMarketingLink();
      if (!marketingTaggedUrl) return;
    }
    try {
      await navigator.clipboard.writeText(marketingTaggedUrl);
      setStatus(marketingLinkStatus, "Tagged link copied.");
    } catch {
      const input = marketingLinkForm.elements.taggedUrl;
      input.focus();
      input.select();
      setStatus(
        marketingLinkStatus,
        "Clipboard access was unavailable; the link is selected."
      );
    }
  }

  async function shareMarketingLink() {
    if (!marketingTaggedUrl) {
      updateMarketingLink();
      if (!marketingTaggedUrl) return;
    }
    const show = shows.find(({ id }) => id === selectedShowId);
    if (typeof navigator.share !== "function") {
      await copyMarketingLink();
      return;
    }
    try {
      await navigator.share({
        title: show?.title || "Dust Wave Podcast",
        text: show?.description || "",
        url: marketingTaggedUrl
      });
      setStatus(marketingLinkStatus, "Share sheet opened.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus(marketingLinkStatus, "Unable to open the share sheet.", true);
      }
    }
  }

  function downloadMarketingQr(format) {
    if (!marketingCurrentQr || !marketingTaggedUrl) {
      updateMarketingLink();
    }
    if (!marketingCurrentQr) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const base = safeMarketingFilename(
      `${show?.slug || "podcast"}-${marketingLinkForm.elements.ref.value || "qr"}`,
      "podcast-qr"
    );
    if (format === "svg") {
      downloadMarketingBlob(
        `${base}.svg`,
        new Blob(
          [qrSvgMarkup(marketingCurrentQr, {
            cellSize: 8,
            margin: 4,
            label: `QR code for ${show?.title || "podcast"}`
          })],
          { type: "image/svg+xml;charset=utf-8" }
        )
      );
      setStatus(marketingLinkStatus, "SVG QR downloaded.");
      return;
    }
    const canvas = document.createElement("canvas");
    drawQrCanvas(marketingCurrentQr, canvas, {
      cellSize: 12,
      margin: 4
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus(
          marketingLinkStatus,
          "The browser could not encode the PNG.",
          true
        );
        return;
      }
      downloadMarketingBlob(`${base}.png`, blob);
      setStatus(marketingLinkStatus, "PNG QR downloaded.");
    }, "image/png");
  }

  function downloadMarketingBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function runAnnouncementDryRun(event) {
    event.preventDefault();
    const show = shows.find(({ id }) => id === selectedShowId);
    if (!show || !announcementForm) return;
    const submit = announcementForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    announcementReview.replaceChildren();
    setStatus(
      announcementStatus,
      "Reviewing the explicit opt-in audience…"
    );
    try {
      const result = await client.request(
        `/v1/admin/shows/${encodeURIComponent(show.id)}/marketing/announcements/dry-run`,
        {
          method: "POST",
          body: {
            language: announcementForm.elements.language.value,
            subject: announcementForm.elements.subject.value,
            heading: announcementForm.elements.heading.value,
            bodyMarkdown: announcementEditor.getMarkdown(),
            ctaLabel: announcementForm.elements.ctaLabel.value,
            ctaUrl: announcementForm.elements.ctaUrl.value
          }
        }
      );
      renderAnnouncementReview(result);
      setStatus(
        announcementStatus,
        `${formatInteger(result.eligibleRecipientCount)} explicitly opted-in active subscriber${
          Number(result.eligibleRecipientCount) === 1 ? "" : "s"
        }. No email sent.`
      );
    } catch (error) {
      setStatus(announcementStatus, friendlyError(error), true);
    } finally {
      submit.disabled = false;
    }
  }

  function renderAnnouncementReview(result) {
    const card = document.createElement("article");
    card.className = "podcast-admin__card";
    const previewBody = document.createElement("div");
    previewBody.className = "podcast-admin__announcement-body";
    previewBody.innerHTML = markdownToEditorHtml(
      result.preview?.bodyMarkdown || ""
    );
    card.innerHTML = `
      <p class="podcast-admin__pill">Review only · Resend blocked</p>
      <h4>${escapeHtml(result.preview?.subject || "Announcement")}</h4>
      ${result.preview?.heading
        ? `<p><strong>${escapeHtml(result.preview.heading)}</strong></p>`
        : ""}
      <p>${formatInteger(result.eligibleRecipientCount)} eligible recipient${
        Number(result.eligibleRecipientCount) === 1 ? "" : "s"
      } · ${escapeHtml(result.preview?.language || "")}</p>`;
    card.append(previewBody);
    if (result.preview?.ctaLabel && result.preview?.ctaUrl) {
      const cta = document.createElement("p");
      const link = document.createElement("a");
      link.className = "btn btn-outline-light";
      link.href = result.preview.ctaUrl;
      link.textContent = result.preview.ctaLabel;
      cta.append(link);
      card.append(cta);
    }
    const evidence = document.createElement("p");
    evidence.innerHTML = `Review hash: <code>${escapeHtml(
      result.reviewHash || ""
    )}</code>`;
    card.append(evidence);
    announcementReview.replaceChildren(card);
  }

  async function saveShow(event) {
    event.preventDefault();
    const button = showForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(showStatus, "Saving…");
    try {
      await client.request(`/v1/admin/shows/${encodeURIComponent(selectedShowId)}`, {
        method: "PATCH",
        body: {
          title: showForm.elements.title.value,
          description: showForm.elements.description.value,
          descriptionEn: showForm.elements.descriptionEn.value,
          earlyAccessDays: Number(showForm.elements.earlyAccessDays.value || 0),
          youtubeChannelUrl: showForm.elements.youtubeChannelUrl.value,
          premiumEnabled: showForm.elements.premiumEnabled.checked,
          freeMiniEpisodeEnabled: showForm.elements.freeMiniEpisodeEnabled.checked
        }
      });
      setStatus(showStatus, "Show settings saved.");
      await loadShows();
    } catch (error) {
      setStatus(showStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadEpisodes() {
    if (!selectedShowId) return;
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/episodes`
      );
      episodes = payload.episodes || [];
      renderEpisodes();
      fillEpisodeSelects();
      await loadAdPlan();
      const productionPanel = root.querySelector("#podcast-panel-production");
      if (productionPanel && !productionPanel.hidden) {
        await Promise.all([
          loadAudioQc(),
          loadTranscript(),
          loadChapters(),
          loadProductionReviews()
        ]);
      }
    } catch (error) {
      setStatus(episodeStatus, friendlyError(error), true);
    }
  }

  async function createEpisode(event) {
    event.preventDefault();
    const button = episodeForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(episodeStatus, "Creating draft…");
    try {
      await client.request(
        `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/episodes`,
        {
          method: "POST",
          body: {
            title: episodeForm.elements.title.value,
            slug: episodeForm.elements.slug.value,
            summary: episodeForm.elements.summary.value,
            contentHtml: notesEditor.getHtml(),
            access: episodeForm.elements.access.value,
            premiumAt: isoOrNull(episodeForm.elements.premiumAt.value),
            publicAt: isoOrNull(episodeForm.elements.publicAt.value)
          }
        }
      );
      episodeForm.reset();
      episodeForm.elements.slug.dataset.edited = "";
      notesEditor.setValue("");
      setStatus(episodeStatus, "Draft created. Attach delivery audio before publishing.");
      await loadShows();
    } catch (error) {
      setStatus(episodeStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function renderEpisodes() {
    if (!episodes.length) {
      episodeList.innerHTML = '<p class="podcast-admin__empty">No episode records yet.</p>';
      return;
    }
    episodeList.replaceChildren(...episodes.map((episode) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__episode";
      const publishable = episode.mediaStatus === "ready";
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(episode.status)} · ${escapeHtml(episode.access)}</p>
          <h3>${escapeHtml(episode.title)}</h3>
          <p>${escapeHtml(episode.summary)}</p>
          <p>Media: ${escapeHtml(episode.mediaStatus)}${episode.audioFilename ? ` · ${escapeHtml(episode.audioFilename)}` : ""}</p>
          <p>Revision: ${Number(episode.publicationRevision || 0)} · Public: ${escapeHtml(formatDate(episode.publicAt))}</p>
        </div>
        <div class="podcast-admin__episode-actions">
          <a class="btn btn-outline-light" href="${escapeAttribute(episode.canonicalUrl)}">Page</a>
          <button class="btn btn-danger" type="button" data-publish-episode="${escapeAttribute(episode.id)}" ${publishable ? "" : "disabled"}>Publish</button>
        </div>`;
      return row;
    }));
  }

  function fillEpisodeSelects() {
    for (const select of [
      uploadForm?.elements.episodeId,
      sponsorForm?.elements.episodeId,
      adPlanForm?.elements.episodeId,
      transcriptEpisodeSelect,
      chapterEpisodeSelect,
      reviewEpisodeSelect,
      audioQcEpisodeSelect
    ].filter(Boolean)) {
      const previousValue = select.value;
      select.replaceChildren(...episodes.map((episode) =>
        new Option(
          `${episode.title} — ${episode.mediaStatus}`,
          episode.id,
          false,
          episode.id === previousValue
        )
      ));
    }
    const campaignEpisodeSelect = campaignForm?.elements.episodeId;
    if (campaignEpisodeSelect) {
      const previousValue = campaignEpisodeSelect.value;
      campaignEpisodeSelect.replaceChildren(
        new Option("All episodes in this show", ""),
        ...episodes.map((episode) =>
          new Option(
            episode.title,
            episode.id,
            false,
            episode.id === previousValue
          )
        )
      );
    }
    const libraryEpisodeSelect = clipLibraryFilters?.elements.episodeId;
    if (libraryEpisodeSelect) {
      const previousValue = libraryEpisodeSelect.value;
      libraryEpisodeSelect.replaceChildren(
        new Option("All episodes", ""),
        ...episodes.map((episode) =>
          new Option(
            episode.title,
            episode.id,
            false,
            episode.id === previousValue
          )
        )
      );
    }
    const previewButton = sponsorForm?.querySelector('button[type="submit"]');
    if (previewButton) previewButton.disabled = episodes.length === 0;
    const adPlanButton = adPlanForm?.querySelector('button[type="submit"]');
    if (adPlanButton) adPlanButton.disabled = episodes.length === 0;
    if (episodes.length === 0) {
      sponsorResult?.replaceChildren();
      adPlanResult?.replaceChildren();
      transcript = null;
      transcriptEditors.clear();
      transcriptCuesRoot?.replaceChildren();
      if (transcriptMeta) {
        transcriptMeta.textContent =
          "Create an episode before reviewing a transcript.";
      }
      chapterSet = null;
      chapterRowsRoot?.replaceChildren();
      if (chapterMeta) {
        chapterMeta.textContent =
          "Create an episode before reviewing chapters.";
      }
      productionReviews = null;
      reviewTargetSelect?.replaceChildren();
      reviewList?.replaceChildren();
      publicationReadiness = null;
      readinessGroups?.replaceChildren();
      audioQcState = null;
      audioQcResults?.replaceChildren();
      if (audioQcSummary) {
        audioQcSummary.textContent =
          "Create an episode before measuring source audio.";
      }
      if (audioQcQueue) audioQcQueue.disabled = true;
      if (reviewReadiness) {
        reviewReadiness.textContent =
          "Create an episode before starting production review.";
      }
      if (readinessSummary) {
        readinessSummary.textContent =
          "Create an episode before inspecting publication readiness.";
      }
      setStatus(sponsorStatus, "Create an episode before previewing sponsor decisions.");
      setStatus(adPlanStatus, "Create an episode before defining ad markers.");
    } else {
      setStatus(sponsorStatus, "");
    }
    fillPodcastEmbedEpisodes();
    fillDistributionEpisodes();
  }

  function fillDistributionEpisodes() {
    if (!distributionFilter) return;
    const select = distributionFilter.elements.episodeId;
    const previousValue = select.value;
    select.replaceChildren(
      new Option("Show setup and directory readiness", ""),
      ...episodes.map((episode) =>
        new Option(
          `${episode.title} — ${episode.status}`,
          episode.id,
          false,
          episode.id === previousValue
        )
      )
    );
    if (!episodes.some(({ id }) => id === previousValue)) {
      select.value = "";
    }
  }

  function publicMarketingEpisodes() {
    const now = Date.now();
    return episodes.filter((episode) => {
      const publicAtMs = Date.parse(episode.publicAt || "");
      return episode.status === "published"
        && ["public", "early_access", "free_mini"].includes(episode.access)
        && Number(episode.publicationRevision || 0) > 0
        && Number.isFinite(publicAtMs)
        && publicAtMs <= now
        && typeof episode.canonicalUrl === "string";
    });
  }

  function fillPodcastEmbedEpisodes() {
    if (embedForm) {
      fillPublicEpisodeSelect(embedForm.elements.episodeId);
      updatePodcastEmbed();
    }
    fillPodcastShareCardEpisodes();
  }

  function fillPublicEpisodeSelect(select) {
    if (!select) return [];
    const eligibleEpisodes = publicMarketingEpisodes();
    const previousValue = select.value;
    select.replaceChildren(
      eligibleEpisodes.length
        ? new Option("Select a public episode", "")
        : new Option("No public episodes available", ""),
      ...eligibleEpisodes.map((episode) =>
        new Option(
          `${episode.title} — revision ${Number(episode.publicationRevision)}`,
          episode.id,
          false,
          episode.id === previousValue
        )
      )
    );
    select.disabled = eligibleEpisodes.length === 0;
    if (!eligibleEpisodes.some(({ id }) => id === previousValue)) {
      select.value = eligibleEpisodes[0]?.id || "";
    }
    return eligibleEpisodes;
  }

  function podcastPublicAssetUrls(show, episode) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(show.slug)
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(episode.slug)
    ) {
      throw new Error("The public episode slug is invalid.");
    }
    const showUrl = new URL(show.canonicalUrl);
    const canonicalUrl = new URL(episode.canonicalUrl);
    const expectedPath =
      `/news/podcasts/${show.slug}/${episode.slug}/`;
    if (
      canonicalUrl.origin !== showUrl.origin
      || canonicalUrl.pathname !== expectedPath
      || canonicalUrl.search
      || canonicalUrl.hash
    ) {
      throw new Error("The episode canonical URL does not match this show.");
    }
    return {
      canonicalUrl: canonicalUrl.toString(),
      embedUrl: new URL("embed/", canonicalUrl).toString(),
      shareCardUrl: new URL(
        `/img/podcasts/${show.slug}/${episode.slug}/social-card.png`,
        canonicalUrl.origin
      ).toString()
    };
  }

  function podcastEmbedFrame(embedUrl, title, { preview = false } = {}) {
    const frame = document.createElement("iframe");
    frame.src = embedUrl;
    frame.title = `${title} podcast player`;
    frame.loading = "lazy";
    frame.setAttribute("allow", "autoplay");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    if (preview) {
      frame.className = "podcast-admin__embed-frame";
    } else {
      frame.setAttribute("data-dust-wave-podcast-embed", "true");
      frame.setAttribute("width", "100%");
      frame.setAttribute("height", "360");
      frame.setAttribute(
        "style",
        "width:100%;height:360px;border:0;border-radius:12px;overflow:hidden"
      );
    }
    return frame;
  }

  function clearPodcastEmbed(message) {
    if (!embedForm) return;
    embedForm.elements.embedUrl.value = "";
    embedForm.elements.embedCode.value = "";
    if (embedCopyButton) embedCopyButton.disabled = true;
    if (embedOpenLink) {
      embedOpenLink.href = "#";
      embedOpenLink.hidden = true;
    }
    embedPreview?.replaceChildren();
    if (embedPreview) embedPreview.hidden = true;
    setStatus(embedStatus, message || "");
  }

  function updatePodcastEmbed() {
    if (!embedForm) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const episode = publicMarketingEpisodes().find(
      ({ id }) => id === embedForm.elements.episodeId.value
    );
    if (!show || !episode) {
      clearPodcastEmbed(
        episodes.length
          ? "No publicly released episode revision is available yet."
          : "Create and publish an episode to generate a player embed."
      );
      return;
    }

    try {
      const { embedUrl } = podcastPublicAssetUrls(show, episode);
      const code = podcastEmbedFrame(embedUrl, episode.title).outerHTML;
      embedForm.elements.embedUrl.value = embedUrl;
      embedForm.elements.embedCode.value = code;
      if (embedCopyButton) embedCopyButton.disabled = false;
      if (embedOpenLink) {
        embedOpenLink.href = embedUrl;
        embedOpenLink.hidden = false;
      }
      if (embedPreview) {
        const label = document.createElement("p");
        label.className = "podcast-admin__field-label";
        label.textContent = "Live preview";
        embedPreview.replaceChildren(
          label,
          podcastEmbedFrame(embedUrl, episode.title, { preview: true })
        );
        embedPreview.hidden = false;
      }
      setStatus(embedStatus, "");
    } catch (error) {
      clearPodcastEmbed(error.message || "Unable to generate the embed.");
    }
  }

  async function copyPodcastEmbed() {
    const code = embedForm?.elements.embedCode.value || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus(embedStatus, "Embed code copied.");
    } catch (_error) {
      embedForm.elements.embedCode.focus();
      embedForm.elements.embedCode.select();
      setStatus(
        embedStatus,
        "Copy is unavailable. The embed code is selected for manual copying.",
        true
      );
    }
  }

  function fillPodcastShareCardEpisodes() {
    if (!shareCardForm) return;
    fillPublicEpisodeSelect(shareCardForm.elements.episodeId);
    updatePodcastShareCard();
  }

  function clearPodcastShareCard(message) {
    if (!shareCardForm) return;
    shareCardForm.elements.shareCardUrl.value = "";
    if (shareCardCopyButton) shareCardCopyButton.disabled = true;
    for (const link of [shareCardDownloadLink, shareCardOpenLink]) {
      if (!link) continue;
      link.href = "#";
      link.hidden = true;
    }
    shareCardPreview?.replaceChildren();
    if (shareCardPreview) shareCardPreview.hidden = true;
    setStatus(shareCardStatus, message || "");
  }

  function updatePodcastShareCard() {
    if (!shareCardForm) return;
    const show = shows.find(({ id }) => id === selectedShowId);
    const episode = publicMarketingEpisodes().find(
      ({ id }) => id === shareCardForm.elements.episodeId.value
    );
    if (!show || !episode) {
      clearPodcastShareCard(
        episodes.length
          ? "No publicly released episode revision is available yet."
          : "Create and publish an episode to generate a social card."
      );
      return;
    }
    try {
      const { shareCardUrl } = podcastPublicAssetUrls(show, episode);
      shareCardForm.elements.shareCardUrl.value = shareCardUrl;
      if (shareCardCopyButton) shareCardCopyButton.disabled = false;
      if (shareCardDownloadLink) {
        shareCardDownloadLink.href = shareCardUrl;
        shareCardDownloadLink.download = `${safeMarketingFilename(
          `${show.slug}-${episode.slug}-social-card`,
          "podcast-social-card"
        )}.png`;
        shareCardDownloadLink.hidden = false;
      }
      if (shareCardOpenLink) {
        shareCardOpenLink.href = shareCardUrl;
        shareCardOpenLink.hidden = false;
      }
      if (shareCardPreview) {
        const image = document.createElement("img");
        image.src = shareCardUrl;
        image.alt = `${episode.title} social card`;
        image.width = 1200;
        image.height = 630;
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => {
          setStatus(
            shareCardStatus,
            "The card is not available at this deployment yet. Rebuild the site from the published episode revision.",
            true
          );
        }, { once: true });
        shareCardPreview.replaceChildren(image);
        shareCardPreview.hidden = false;
      }
      setStatus(shareCardStatus, "");
    } catch (error) {
      clearPodcastShareCard(
        error.message || "Unable to resolve the social-card URL."
      );
    }
  }

  async function copyPodcastShareCardUrl() {
    const url = shareCardForm?.elements.shareCardUrl.value || "";
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(shareCardStatus, "Social-card URL copied.");
    } catch (_error) {
      shareCardForm.elements.shareCardUrl.focus();
      shareCardForm.elements.shareCardUrl.select();
      setStatus(
        shareCardStatus,
        "Copy is unavailable. The image URL is selected for manual copying.",
        true
      );
    }
  }

  async function uploadMedia(event) {
    event.preventDefault();
    const file = uploadForm.elements.media.files[0];
    if (!file) return;
    const button = uploadForm.querySelector('button[type="submit"]');
    button.disabled = true;
    uploadProgress.hidden = false;
    uploadProgress.value = 0;
    setStatus(uploadStatus, "Preparing upload…");
    try {
      const created = await client.request("/v1/admin/uploads", {
        method: "POST",
        body: {
          showId: selectedShowId,
          episodeId: uploadForm.elements.episodeId.value,
          kind: uploadForm.elements.kind.value,
          filename: file.name,
          contentType: file.type || fallbackMime(file.name),
          expectedBytes: file.size
        }
      });
      const partBytes = created.recommendedPartBytes;
      const partCount = Math.ceil(file.size / partBytes);
      for (let index = 0; index < partCount; index += 1) {
        const part = file.slice(index * partBytes, Math.min(file.size, (index + 1) * partBytes));
        setStatus(uploadStatus, `Uploading part ${index + 1} of ${partCount}…`);
        await client.request(
          `/v1/admin/uploads/${encodeURIComponent(created.uploadId)}/parts/${index + 1}`,
          {
            method: "PUT",
            body: part,
            headers: { "content-type": file.type || "application/octet-stream" }
          }
        );
        uploadProgress.value = Math.round(((index + 1) / partCount) * 100);
      }
      await client.request(
        `/v1/admin/uploads/${encodeURIComponent(created.uploadId)}/complete`,
        { method: "POST", body: {} }
      );
      uploadForm.reset();
      setStatus(uploadStatus, "Upload completed and verified.");
      await loadEpisodes();
    } catch (error) {
      setStatus(uploadStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadTranscript() {
    const episodeId = transcriptEpisodeSelect?.value;
    const language = transcriptLanguageSelect?.value || "es";
    transcriptRequestId += 1;
    const requestId = transcriptRequestId;
    transcriptPage = 0;
    transcriptEditors.clear();
    transcriptCuesRoot?.replaceChildren();
    if (!episodeId) {
      transcript = null;
      clips = [];
      selectedClipId = "";
      if (transcriptWorkbench) transcriptWorkbench.hidden = true;
      if (transcriptPages) transcriptPages.hidden = true;
      clipList?.replaceChildren();
      updateClipAvailability();
      if (transcriptMeta) {
        transcriptMeta.textContent =
          "Create an episode before reviewing a transcript.";
      }
      return;
    }
    if (transcriptWorkbench) transcriptWorkbench.hidden = false;
    setStatus(transcriptStatus, "Loading transcript review state…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts`
      );
      if (requestId !== transcriptRequestId) return;
      transcriptDurationSeconds = Number.isFinite(
        Number(payload.durationSeconds)
      )
        ? Number(payload.durationSeconds)
        : null;
      transcript = (payload.transcripts || []).find(
        (candidate) => candidate.language === language
      ) || emptyTranscript(language);
      transcriptDirty = false;
      renderTranscript();
      await loadClips();
      setStatus(transcriptStatus, "");
    } catch (error) {
      if (requestId !== transcriptRequestId) return;
      transcript = null;
      transcriptEditors.clear();
      transcriptCuesRoot?.replaceChildren();
      if (transcriptPages) transcriptPages.hidden = true;
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      setStatus(transcriptStatus, friendlyError(error), true);
    }
  }

  function renderTranscript() {
    if (!transcript || !transcriptCuesRoot) return;
    const episode = episodes.find(
      ({ id }) => id === transcriptEpisodeSelect?.value
    );
    const alignment = transcript.alignment || {};
    const alignmentLabel = alignment.status === "passed"
      ? `${Number(alignment.alignedWordCount || 0)} aligned words`
      : humanizeCode(alignment.status || "not_run");
    if (transcriptMeta) {
      transcriptMeta.textContent = [
        episode?.title || "Episode",
        `revision ${Number(transcript.revision || 0)}`,
        humanizeCode(transcript.status || "new"),
        `alignment: ${alignmentLabel}`,
        alignment.wordControlsEnabled
          ? "word controls available"
          : "word controls locked"
      ].join(" · ");
    }
    transcriptEditors.clear();
    const cues = transcript.cues?.length
      ? transcript.cues
      : [newTranscriptCue()];
    transcript.cues = cues;
    const pageCount = Math.max(
      1,
      Math.ceil(cues.length / TRANSCRIPT_CUES_PER_PAGE)
    );
    transcriptPage = Math.min(transcriptPage, pageCount - 1);
    const firstCueIndex = transcriptPage * TRANSCRIPT_CUES_PER_PAGE;
    const lastCueIndex = Math.min(
      cues.length,
      firstCueIndex + TRANSCRIPT_CUES_PER_PAGE
    );
    const visibleCues = cues.slice(firstCueIndex, lastCueIndex);
    if (transcriptPages) transcriptPages.hidden = pageCount <= 1;
    if (transcriptPageLabel) {
      transcriptPageLabel.textContent =
        `Cues ${firstCueIndex + 1}–${lastCueIndex} of ${cues.length}`;
    }
    if (transcriptPreviousButton) {
      transcriptPreviousButton.disabled = transcriptPage === 0;
    }
    if (transcriptNextButton) {
      transcriptNextButton.disabled = transcriptPage >= pageCount - 1;
    }
    const rows = visibleCues.map((cue, visibleIndex) => {
      const index = firstCueIndex + visibleIndex;
      const row = document.createElement("article");
      row.className = "podcast-admin__transcript-cue";
      row.dataset.transcriptCueId = cue.id;
      row.innerHTML = `
        <div class="podcast-admin__transcript-cue-heading">
          <h3>Cue ${index + 1}</h3>
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-transcript-remove="${escapeAttribute(cue.id)}">
            Remove
          </button>
        </div>
        <div class="podcast-admin__field-grid">
          <label>Start (seconds)
            <input data-transcript-start type="number" min="0" step="0.001" required>
          </label>
          <label>End (seconds)
            <input data-transcript-end type="number" min="0.001" step="0.001" required>
          </label>
          <label>Public speaker label
            <input data-transcript-speaker maxlength="80">
          </label>
          <label class="podcast-admin__checkbox">
            <input data-transcript-speaker-confirmed type="checkbox">
            I confirmed this public speaker name
          </label>
        </div>
        <label>Caption text</label>
        <div data-transcript-editor></div>`;
      const start = row.querySelector("[data-transcript-start]");
      const end = row.querySelector("[data-transcript-end]");
      const speaker = row.querySelector("[data-transcript-speaker]");
      const confirmed = row.querySelector(
        "[data-transcript-speaker-confirmed]"
      );
      start.value = millisecondsToSeconds(cue.startsAtMs);
      end.value = millisecondsToSeconds(cue.endsAtMs);
      speaker.value = cue.speakerLabel || "";
      confirmed.checked = cue.speakerConfirmed === true;
      confirmed.disabled = !canEditTranscripts || !speaker.value;
      speaker.addEventListener("input", () => {
        transcriptDirty = true;
        confirmed.disabled = !canEditTranscripts || !speaker.value.trim();
        if (!speaker.value.trim()) confirmed.checked = false;
        transcriptApproveButton.disabled = true;
        updateClipAvailability();
      });
      for (const control of [start, end, confirmed]) {
        control.addEventListener("input", () => {
          transcriptDirty = true;
          transcriptApproveButton.disabled = true;
          updateClipAvailability();
        });
      }
      for (const control of [start, end, speaker]) {
        control.disabled = !canEditTranscripts;
      }
      const remove = row.querySelector("[data-podcast-transcript-remove]");
      remove.disabled = !canEditTranscripts || cues.length === 1;
      const editor = mountRichTextEditor(
        row.querySelector("[data-transcript-editor]"),
        {
          value: cue.textMarkdown || "",
          mode: "timed_text",
          label: `Cue ${index + 1} caption`,
          onChange() {
            transcriptDirty = true;
            transcriptApproveButton.disabled = true;
            updateClipAvailability();
          }
        }
      );
      if (!canEditTranscripts) {
        editor.editor.contentEditable = "false";
        row.querySelectorAll(".dw-editor__toolbar button").forEach((button) => {
          button.disabled = true;
        });
      }
      transcriptEditors.set(cue.id, editor);
      return row;
    });
    transcriptCuesRoot.replaceChildren(...rows);
    transcriptAddButton.hidden = !canEditTranscripts;
    transcriptSaveButton.hidden = !canEditTranscripts;
    transcriptApproveButton.hidden = !canApproveTranscripts;
    transcriptApproveButton.disabled = !canApproveTranscripts
      || Number(transcript.revision || 0) < 1
      || transcript.status === "approved"
      || transcriptDirty
      || transcript.speakerLabelsConfirmed !== true;
    updateClipAvailability();
  }

  function addTranscriptCue() {
    if (!transcript || !canEditTranscripts) return;
    try {
      const cues = syncVisibleTranscriptCues({ requireText: false });
      const last = cues.at(-1);
      const startsAtMs = last?.endsAtMs || 0;
      const episodeEndMs = transcriptDurationSeconds === null
        ? null
        : Math.round(transcriptDurationSeconds * 1_000);
      if (episodeEndMs !== null && startsAtMs >= episodeEndMs) {
        throw new Error(
          "The last cue already reaches the reviewed episode duration."
        );
      }
      const endsAtMs = episodeEndMs === null
        ? startsAtMs + 5_000
        : Math.min(startsAtMs + 5_000, episodeEndMs);
      transcript.cues = cues.concat(newTranscriptCue(startsAtMs, endsAtMs));
      transcriptPage = Math.floor(
        (transcript.cues.length - 1) / TRANSCRIPT_CUES_PER_PAGE
      );
      transcriptDirty = true;
      renderTranscript();
      transcriptCuesRoot.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  function removeTranscriptCue(cueId) {
    if (!transcript || !canEditTranscripts) return;
    try {
      const cues = syncVisibleTranscriptCues({ requireText: false });
      if (cues.length <= 1) {
        throw new Error("A transcript must keep at least one cue.");
      }
      transcript.cues = cues.filter(({ id }) => id !== cueId);
      transcriptPage = Math.min(
        transcriptPage,
        Math.max(
          0,
          Math.ceil(transcript.cues.length / TRANSCRIPT_CUES_PER_PAGE) - 1
        )
      );
      transcriptDirty = true;
      renderTranscript();
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  async function saveTranscript() {
    if (!transcript || !canEditTranscripts) return;
    transcriptSaveButton.disabled = true;
    transcriptAddButton.disabled = true;
    setStatus(transcriptStatus, "Saving versioned transcript draft…");
    try {
      const episodeId = transcriptEpisodeSelect.value;
      const language = transcriptLanguageSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts/${encodeURIComponent(language)}`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("transcript_edit"),
            baseRevision: Number(transcript.revision || 0),
            cues: syncVisibleTranscriptCues()
          }
        }
      );
      transcript = payload.transcript;
      transcriptDirty = false;
      renderTranscript();
      setStatus(
        transcriptStatus,
        "Transcript draft saved. Approval and word-alignment are independent gates."
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(
        transcriptStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : transcriptInputError(error),
        true
      );
    } finally {
      transcriptSaveButton.disabled = false;
      transcriptAddButton.disabled = false;
    }
  }

  async function approveTranscript() {
    if (!transcript || !canApproveTranscripts) return;
    if (transcriptDirty) {
      setStatus(
        transcriptStatus,
        "Save the current cue edits before approving this revision.",
        true
      );
      return;
    }
    transcriptApproveButton.disabled = true;
    setStatus(transcriptStatus, "Approving reviewed transcript revision…");
    try {
      const episodeId = transcriptEpisodeSelect.value;
      const language = transcriptLanguageSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/transcripts/${encodeURIComponent(language)}/approve`,
        {
          method: "POST",
          body: {
            approvalId: operationId("transcript_approval"),
            expectedRevision: Number(transcript.revision)
          }
        }
      );
      transcript = payload.transcript;
      transcriptDirty = false;
      renderTranscript();
      setStatus(
        transcriptStatus,
        transcript.alignment?.wordControlsEnabled
          ? "Transcript approved; matching word alignment is available."
          : "Transcript approved; word controls remain locked until matching alignment passes."
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(transcriptStatus, friendlyError(error), true);
    } finally {
      if (transcript) renderTranscript();
    }
  }

  function moveTranscriptPage(offset) {
    if (!transcript) return;
    try {
      syncVisibleTranscriptCues({ requireText: false });
      const pageCount = Math.max(
        1,
        Math.ceil(transcript.cues.length / TRANSCRIPT_CUES_PER_PAGE)
      );
      transcriptPage = Math.max(
        0,
        Math.min(pageCount - 1, transcriptPage + offset)
      );
      renderTranscript();
    } catch (error) {
      setStatus(transcriptStatus, transcriptInputError(error), true);
    }
  }

  function syncVisibleTranscriptCues({ requireText = true } = {}) {
    const visibleCues = collectVisibleTranscriptCues({ requireText });
    const visibleById = new Map(
      visibleCues.map((cue) => [cue.id, cue])
    );
    transcript.cues = transcript.cues.map(
      (cue) => visibleById.get(cue.id) || cue
    );
    if (requireText) {
      const missingIndex = transcript.cues.findIndex(
        ({ textMarkdown }) => !String(textMarkdown || "").trim()
      );
      if (missingIndex >= 0) {
        throw new Error(`Cue ${missingIndex + 1} needs caption text.`);
      }
    }
    return transcript.cues;
  }

  function collectVisibleTranscriptCues({ requireText = true } = {}) {
    const rows = Array.from(
      transcriptCuesRoot?.querySelectorAll("[data-transcript-cue-id]") || []
    );
    if (!rows.length) throw new Error("Add at least one transcript cue.");
    return rows.map((row, index) => {
      const cueNumber =
        transcriptPage * TRANSCRIPT_CUES_PER_PAGE + index + 1;
      const startsAtMs = secondsToMilliseconds(
        row.querySelector("[data-transcript-start]").value,
        `Cue ${cueNumber} start`
      );
      const endsAtMs = secondsToMilliseconds(
        row.querySelector("[data-transcript-end]").value,
        `Cue ${cueNumber} end`
      );
      const speakerLabel = row
        .querySelector("[data-transcript-speaker]")
        .value
        .trim();
      const textMarkdown = transcriptEditors
        .get(row.dataset.transcriptCueId)
        ?.getMarkdown()
        .trim();
      if (requireText && !textMarkdown) {
        throw new Error(`Cue ${cueNumber} needs caption text.`);
      }
      return {
        id: row.dataset.transcriptCueId,
        startsAtMs,
        endsAtMs,
        speakerLabel,
        speakerConfirmed: speakerLabel
          ? row.querySelector("[data-transcript-speaker-confirmed]").checked
          : false,
        textMarkdown
      };
    });
  }

  async function loadChapters() {
    const episodeId = chapterEpisodeSelect?.value;
    const requestId = ++chapterRequestId;
    chapterRowsRoot?.replaceChildren();
    chapterDirty = false;
    if (!episodeId) {
      chapterSet = null;
      if (chapterWorkbench) chapterWorkbench.hidden = true;
      if (chapterMeta) {
        chapterMeta.textContent =
          "Create an episode before reviewing chapters.";
      }
      return;
    }
    if (chapterWorkbench) chapterWorkbench.hidden = false;
    setStatus(chapterStatus, "Loading chapter review state…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters`
      );
      if (requestId !== chapterRequestId) return;
      chapterSet = payload.chapterSet || emptyChapterSet(episodeId);
      chapterDirty = false;
      renderChapters();
      setStatus(chapterStatus, "");
    } catch (error) {
      if (requestId !== chapterRequestId) return;
      chapterSet = null;
      chapterRowsRoot?.replaceChildren();
      setStatus(chapterStatus, friendlyError(error), true);
    }
  }

  function renderChapters() {
    if (!chapterSet || !chapterRowsRoot) return;
    const episode = episodes.find(
      ({ id }) => id === chapterEpisodeSelect?.value
    );
    if (chapterMeta) {
      chapterMeta.textContent = [
        episode?.title || "Episode",
        `revision ${Number(chapterSet.revision || 0)}`,
        humanizeCode(chapterSet.status || "needs_review"),
        `${chapterSet.chapters?.length || 0} chapter${
          Number(chapterSet.chapters?.length || 0) === 1 ? "" : "s"
        }`
      ].join(" · ");
    }
    const chapters = chapterSet.chapters?.length
      ? chapterSet.chapters
      : [newChapter(0)];
    chapterSet.chapters = chapters;
    const rows = chapters.map((chapter, index) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__chapter-row";
      row.dataset.podcastChapterId = chapter.id;
      row.innerHTML = `
        <div class="podcast-admin__transcript-cue-heading">
          <h3>Chapter ${index + 1}</h3>
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-chapter-remove="${escapeAttribute(chapter.id)}">
            Remove
          </button>
        </div>
        <div class="podcast-admin__field-grid">
          <label>Start (seconds)
            <input data-chapter-start type="number" min="0" step="0.001" required>
          </label>
          <label>Title · español / English
            <input data-chapter-title maxlength="160" required>
          </label>
        </div>
        <div class="podcast-admin__field-grid">
          <label>Related HTTPS link (optional)
            <input data-chapter-url type="url" inputmode="url" maxlength="2048">
          </label>
          <label>HTTPS artwork URL (optional)
            <input data-chapter-image-url type="url" inputmode="url" maxlength="2048">
          </label>
        </div>
        <label class="podcast-admin__checkbox">
          <input data-chapter-toc type="checkbox">
          Show this marker in chapter tables of contents
        </label>`;
      row.querySelector("[data-chapter-start]").value =
        millisecondsToSeconds(chapter.startsAtMs);
      row.querySelector("[data-chapter-title]").value = chapter.title || "";
      row.querySelector("[data-chapter-url]").value = chapter.url || "";
      row.querySelector("[data-chapter-image-url]").value =
        chapter.imageUrl || "";
      row.querySelector("[data-chapter-toc]").checked = chapter.toc !== false;
      row.querySelectorAll("input").forEach((input) => {
        input.disabled = !canEditChapters;
      });
      row.querySelector("[data-podcast-chapter-remove]").disabled =
        !canEditChapters || chapters.length === 1;
      return row;
    });
    chapterRowsRoot.replaceChildren(...rows);
    chapterAddButton.hidden = !canEditChapters;
    chapterSaveButton.hidden = !canEditChapters;
    chapterApproveButton.hidden = !canApproveChapters;
    chapterApproveButton.disabled = !canApproveChapters
      || Number(chapterSet.revision || 0) < 1
      || chapterSet.status === "approved"
      || chapterDirty;
  }

  function markChaptersDirty() {
    if (!chapterSet || !canEditChapters) return;
    chapterDirty = true;
    if (chapterApproveButton) chapterApproveButton.disabled = true;
  }

  function addChapter() {
    if (!chapterSet || !canEditChapters) return;
    try {
      const chapters = collectChapters({ requireTitles: false });
      const lastStart = chapters.at(-1)?.startsAtMs ?? -1;
      const durationMs = Number.isFinite(Number(chapterSet.durationSeconds))
        ? Math.round(Number(chapterSet.durationSeconds) * 1_000)
        : null;
      let startsAtMs = lastStart < 0 ? 0 : lastStart + 120_000;
      if (durationMs !== null && startsAtMs >= durationMs) {
        startsAtMs = durationMs - 1_000;
      }
      if (startsAtMs <= lastStart || startsAtMs < 0) {
        throw new Error(
          "There is no remaining episode time for another chapter."
        );
      }
      chapterSet.chapters = chapters.concat(newChapter(startsAtMs));
      chapterDirty = true;
      renderChapters();
      chapterRowsRoot.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    } catch (error) {
      setStatus(chapterStatus, chapterInputError(error), true);
    }
  }

  function removeChapter(chapterId) {
    if (!chapterSet || !canEditChapters) return;
    try {
      const chapters = collectChapters({ requireTitles: false });
      if (chapters.length <= 1) {
        throw new Error("An approved chapter document needs one chapter.");
      }
      chapterSet.chapters = chapters.filter(({ id }) => id !== chapterId);
      chapterDirty = true;
      renderChapters();
    } catch (error) {
      setStatus(chapterStatus, chapterInputError(error), true);
    }
  }

  function collectChapters({ requireTitles = true } = {}) {
    const rows = Array.from(
      chapterRowsRoot?.querySelectorAll("[data-podcast-chapter-id]") || []
    );
    if (!rows.length) throw new Error("Add at least one chapter.");
    const durationMs = Number.isFinite(Number(chapterSet?.durationSeconds))
      ? Math.round(Number(chapterSet.durationSeconds) * 1_000)
      : null;
    let previousStart = -1;
    return rows.map((row, index) => {
      const startsAtMs = secondsToMilliseconds(
        row.querySelector("[data-chapter-start]").value,
        `Chapter ${index + 1} start`
      );
      if (index === 0 && startsAtMs !== 0) {
        throw new Error("The first chapter must start at 00:00.");
      }
      if (startsAtMs <= previousStart) {
        throw new Error(
          `Chapter ${index + 1} must start after the previous chapter.`
        );
      }
      if (durationMs !== null && startsAtMs >= durationMs) {
        throw new Error(
          `Chapter ${index + 1} starts outside the episode duration.`
        );
      }
      previousStart = startsAtMs;
      const title = row.querySelector("[data-chapter-title]").value.trim();
      if (requireTitles && !title) {
        throw new Error(`Chapter ${index + 1} needs a title.`);
      }
      const url = checkedHttpsUrl(
        row.querySelector("[data-chapter-url]").value,
        `Chapter ${index + 1} link`
      );
      const imageUrl = checkedHttpsUrl(
        row.querySelector("[data-chapter-image-url]").value,
        `Chapter ${index + 1} artwork`
      );
      return {
        id: row.dataset.podcastChapterId,
        startsAtMs,
        title,
        url,
        imageUrl,
        toc: row.querySelector("[data-chapter-toc]").checked
      };
    });
  }

  async function saveChapters() {
    if (!chapterSet || !canEditChapters) return;
    chapterSaveButton.disabled = true;
    chapterAddButton.disabled = true;
    setStatus(chapterStatus, "Saving versioned chapter draft…");
    try {
      const episodeId = chapterEpisodeSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("chapter_edit"),
            baseRevision: Number(chapterSet.revision || 0),
            chapters: collectChapters()
          }
        }
      );
      chapterSet = payload.chapterSet;
      chapterDirty = false;
      renderChapters();
      setStatus(
        chapterStatus,
        "Chapter draft saved. The prior approved revision remains public until approval."
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(
        chapterStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : chapterInputError(error),
        true
      );
    } finally {
      chapterSaveButton.disabled = false;
      chapterAddButton.disabled = false;
    }
  }

  async function approveChapters() {
    if (!chapterSet || !canApproveChapters) return;
    if (chapterDirty) {
      setStatus(
        chapterStatus,
        "Save the current chapter edits before approving this revision.",
        true
      );
      return;
    }
    chapterApproveButton.disabled = true;
    setStatus(chapterStatus, "Approving reviewed chapter revision…");
    try {
      const episodeId = chapterEpisodeSelect.value;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/chapters/approve`,
        {
          method: "POST",
          body: {
            approvalId: operationId("chapter_approval"),
            expectedRevision: Number(chapterSet.revision)
          }
        }
      );
      chapterSet = payload.chapterSet;
      chapterDirty = false;
      renderChapters();
      setStatus(
        chapterStatus,
        "Chapter revision approved for eligible feeds and canonical News pages."
      );
      await refreshReviewEvidenceForEpisode(episodeId);
    } catch (error) {
      setStatus(chapterStatus, friendlyError(error), true);
    } finally {
      if (chapterSet) renderChapters();
    }
  }

  async function loadAudioQc() {
    const episodeId = audioQcEpisodeSelect?.value || "";
    const requestId = ++audioQcRequestId;
    audioQcState = null;
    audioQcResults?.replaceChildren();
    if (!episodeId) {
      if (audioQcSummary) {
        audioQcSummary.textContent =
          "Create an episode before measuring source audio.";
      }
      if (audioQcQueue) audioQcQueue.disabled = true;
      setStatus(audioQcStatus, "");
      return;
    }
    if (audioQcQueue) audioQcQueue.disabled = true;
    setStatus(audioQcStatus, "Loading source-audio QC evidence…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-qc`
      );
      if (requestId !== audioQcRequestId) return;
      audioQcState = payload;
      renderAudioQc();
      setStatus(audioQcStatus, "");
    } catch (error) {
      if (requestId !== audioQcRequestId) return;
      if (audioQcSummary) {
        audioQcSummary.textContent =
          "Source-audio QC evidence could not be loaded.";
      }
      setStatus(audioQcStatus, friendlyError(error), true);
    }
  }

  function renderAudioQc() {
    if (
      !audioQcState
      || !audioQcSummary
      || !audioQcResults
    ) return;
    const source = audioQcState.source;
    const policy = audioQcState.policy || {};
    const processor = audioQcState.processor || {};
    const runs = Array.isArray(audioQcState.runs)
      ? audioQcState.runs
      : [];
    audioQcSummary.textContent = source
      ? [
          `Source: ${String(source.filename || "private audio")}`,
          formatBytes(Number(source.objectBytes || 0)),
          `policy r${Number(policy.revision || 0)}`,
          processor.available
            ? "signed staging processor ready"
            : "processor unavailable"
        ].join(" · ")
      : "Complete a source-audio upload before queueing measured QC.";
    if (audioQcQueue) {
      audioQcQueue.disabled =
        !canRunAudioQc || !source || !processor.available;
    }
    if (!runs.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent =
        "No quality report exists for this source and policy yet.";
      audioQcResults.replaceChildren(empty);
      return;
    }
    audioQcResults.replaceChildren(...runs.map(renderAudioQcRun));
  }

  function renderAudioQcRun(run) {
    const article = document.createElement("article");
    const status = String(run.status || "queued");
    article.className =
      `podcast-admin__readiness-card is-${audioQcCardStatus(status)}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = `QC run ${String(run.id || "")}`;
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = status;
    heading.append(title, pill);
    const summary = document.createElement("p");
    if (status === "succeeded") {
      const values = run.summary || {};
      summary.textContent = [
        `${Number(values.blockerCount || 0)} blocker${
          Number(values.blockerCount || 0) === 1 ? "" : "s"
        }`,
        `${Number(values.warningCount || 0)} warning${
          Number(values.warningCount || 0) === 1 ? "" : "s"
        }`,
        `${Number(values.integratedLufs || 0)} LUFS`,
        `${Number(values.truePeakDbtp || 0)} dBTP`,
        formatDurationMilliseconds(Number(values.durationMs || 0))
      ].join(" · ");
    } else if (status === "failed") {
      summary.textContent =
        `Processor failed safely: ${humanizeCode(run.failureCode || "processor_failed")}.`;
    } else {
      summary.textContent =
        "Queued for the owner-controlled staging workflow; no audio was changed.";
    }
    article.append(heading, summary);
    if (status === "succeeded") {
      const report = run.report || {};
      const quality = report.quality || {};
      const findings = Array.isArray(quality.findings)
        ? quality.findings
        : [];
      const details = document.createElement("details");
      const detailsSummary = document.createElement("summary");
      detailsSummary.textContent = findings.length
        ? `Review ${findings.length} measured finding${
            findings.length === 1 ? "" : "s"
          }`
        : "Review clean measured evidence";
      const list = document.createElement("ul");
      list.className = "podcast-admin__audio-qc-findings";
      if (!findings.length) {
        const item = document.createElement("li");
        item.textContent = "No policy warning or blocker was measured.";
        list.append(item);
      } else {
        for (const finding of findings) {
          const item = document.createElement("li");
          const label = document.createElement("strong");
          label.textContent =
            `${humanizeCode(finding.code)} · ${String(finding.severity)}`;
          const evidence = document.createElement("span");
          evidence.textContent = [
            `${Number(finding.measured)} ${String(finding.unit || "")}`,
            `limit ${Number(finding.limit)} ${String(finding.unit || "")}`,
            String(finding.remediation || "")
          ].join(" · ");
          item.append(label, evidence);
          list.append(item);
        }
      }
      details.append(detailsSummary, list);
      article.append(details);
    }
    return article;
  }

  async function queueAudioQc() {
    const episodeId = audioQcEpisodeSelect?.value || "";
    if (!episodeId || !canRunAudioQc || !audioQcState?.source) return;
    audioQcQueue.disabled = true;
    setStatus(audioQcStatus, "Snapshotting private source and QC policy…");
    try {
      const runId = `qc_${crypto.randomUUID().replace(/-/g, "")}`;
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-qc`,
        {
          method: "POST",
          body: { runId }
        }
      );
      await loadAudioQc();
      setStatus(
        audioQcStatus,
        `QC run ${String(payload.run?.id || runId)} is queued. `
          + "Dispatch the pinned staging audio-QC workflow, then refresh this report."
      );
    } catch (error) {
      setStatus(audioQcStatus, friendlyError(error), true);
      renderAudioQc();
    }
  }

  function audioQcCardStatus(status) {
    if (status === "succeeded") return "ready";
    if (status === "failed") return "failed";
    return "pending";
  }

  async function loadProductionReviews() {
    const episodeId = reviewEpisodeSelect?.value;
    const requestId = ++reviewRequestId;
    productionReviews = null;
    reviewTargetSelect?.replaceChildren();
    reviewList?.replaceChildren();
    if (!episodeId) {
      if (reviewReadiness) {
        reviewReadiness.textContent =
          "Create an episode before starting production review.";
      }
      await loadPublicationReadiness("");
      return;
    }
    const readinessPromise = loadPublicationReadiness(episodeId);
    setStatus(reviewStatus, "Loading exact-revision review state…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/reviews`
      );
      if (requestId !== reviewRequestId) return;
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, "");
    } catch (error) {
      if (requestId !== reviewRequestId) return;
      setStatus(reviewStatus, friendlyError(error), true);
    } finally {
      await readinessPromise;
    }
  }

  async function refreshReviewEvidenceForEpisode(episodeId) {
    if (episodeId === reviewEpisodeSelect?.value) {
      await loadProductionReviews();
    }
  }

  async function loadPublicationReadiness(
    episodeId = reviewEpisodeSelect?.value || ""
  ) {
    const requestId = ++readinessRequestId;
    publicationReadiness = null;
    readinessGroups?.replaceChildren();
    if (!episodeId) {
      if (readinessSummary) {
        readinessSummary.textContent =
          "Create an episode before inspecting publication readiness.";
      }
      setStatus(readinessStatus, "");
      return;
    }
    setStatus(readinessStatus, "Loading read-only dependency snapshot…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/readiness`
      );
      if (requestId !== readinessRequestId) return;
      publicationReadiness = payload;
      renderPublicationReadiness();
      setStatus(readinessStatus, "");
    } catch (error) {
      if (requestId !== readinessRequestId) return;
      if (readinessSummary) {
        readinessSummary.textContent =
          "The dependency snapshot could not be loaded.";
      }
      setStatus(readinessStatus, friendlyError(error), true);
    }
  }

  function renderPublicationReadiness() {
    if (
      !publicationReadiness
      || !readinessSummary
      || !readinessGroups
    ) return;
    const legacy = publicationReadiness.legacyGate || {};
    const candidate = publicationReadiness.candidateGate || {};
    const digest = String(publicationReadiness.snapshotDigest || "");
    readinessSummary.textContent = [
      legacy.ready
        ? "Current Publish checks pass"
        : `${(legacy.missing || []).length} current Publish check${
          (legacy.missing || []).length === 1 ? "" : "s"
        } missing`,
      candidate.ready
        ? "launch candidate ready"
        : `${Number(candidate.blockerCount || 0)} candidate blocker${
          Number(candidate.blockerCount || 0) === 1 ? "" : "s"
        }`,
      `${Number(candidate.warningCount || 0)} warning${
        Number(candidate.warningCount || 0) === 1 ? "" : "s"
      }`,
      `publication revision ${Number(
        publicationReadiness.publicationRevision || 0
      )}`,
      digest ? `snapshot ${digest.slice(0, 12)}` : "",
      publicationGateLabel(publicationReadiness.publicationGateMode)
    ].filter(Boolean).join(" · ");

    const groups = new Map();
    for (const readinessNode of publicationReadiness.nodes || []) {
      const group = String(readinessNode.group || "core");
      const current = groups.get(group) || [];
      current.push(readinessNode);
      groups.set(group, current);
    }
    const groupOrder = ["core", "editorial", "monetization", "distribution"];
    readinessGroups.replaceChildren(...groupOrder
      .filter((group) => groups.has(group))
      .map((group) => renderReadinessGroup(group, groups.get(group))));
  }

  function renderReadinessGroup(group, nodes) {
    const section = document.createElement("section");
    section.className = "podcast-admin__readiness-group";
    const heading = document.createElement("h3");
    heading.textContent = {
      core: "Core release",
      editorial: "Editorial evidence",
      monetization: "Monetization",
      distribution: "Distribution"
    }[group] || humanizeCode(group);
    const list = document.createElement("div");
    list.className = "podcast-admin__readiness-list";
    list.replaceChildren(...nodes.map(renderReadinessNode));
    section.append(heading, list);
    return section;
  }

  function renderReadinessNode(readinessNode) {
    const card = document.createElement("article");
    const status = String(readinessNode.status || "missing");
    const severity = String(readinessNode.severity || "info");
    card.className =
      `podcast-admin__readiness-card is-${status} severity-${severity}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = String(readinessNode.label || "Dependency");
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = `${humanizeCode(status)} · ${humanizeCode(severity)}`;
    heading.append(title, pill);
    const summary = document.createElement("p");
    summary.textContent = String(readinessNode.summary || "");
    const evidence = document.createElement("details");
    const evidenceSummary = document.createElement("summary");
    evidenceSummary.textContent = "Evidence";
    const values = document.createElement("dl");
    values.className = "podcast-admin__readiness-evidence";
    for (const [key, value] of Object.entries(readinessNode.evidence || {})) {
      const term = document.createElement("dt");
      term.textContent = humanizeCode(key);
      const description = document.createElement("dd");
      description.textContent = readinessEvidenceValue(value);
      values.append(term, description);
    }
    evidence.append(evidenceSummary, values);
    card.append(heading, summary, evidence);
    return card;
  }

  function readinessEvidenceValue(value) {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value === null || value === undefined || value === "") return "None";
    return String(value);
  }

  function renderProductionReviews() {
    if (!productionReviews || !reviewTargetSelect || !reviewList) return;
    const previousTarget = reviewTargetSelect.value;
    const targets = productionReviews.targetOptions || [];
    reviewTargetSelect.replaceChildren(...targets.map((target) => {
      const option = new Option(
        `${target.label} — revision ${Number(target.revision)}`,
        `${target.type}:${target.id}`,
        false,
        `${target.type}:${target.id}` === previousTarget
      );
      option.dataset.targetType = target.type;
      option.dataset.targetId = target.id;
      return option;
    }));
    reviewTargetSelect.disabled = !canEditReviews || targets.length === 0;
    const submit = reviewForm?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = !canEditReviews || targets.length === 0;

    const readiness = productionReviews.readiness || {};
    if (reviewReadiness) {
      reviewReadiness.textContent = targets.length === 0
        ? "No versioned audio, transcript, chapter, clip, or ad-plan target is ready for review."
        : [
            `${Number(readiness.currentTargetCount || targets.length)} current target${
              Number(readiness.currentTargetCount || targets.length) === 1
                ? ""
                : "s"
            }`,
            `${Number(readiness.currentReviewCount || 0)} current review target${
              Number(readiness.currentReviewCount || 0) === 1 ? "" : "s"
            }`,
            `${Number(readiness.approvedCurrentReviewCount || 0)} approved`,
            `${Number(readiness.unreviewedCurrentTargetCount || 0)} unreviewed`,
            `${Number(readiness.openBlockerCount || 0)} open blocker${
              Number(readiness.openBlockerCount || 0) === 1 ? "" : "s"
            }`,
            readiness.reviewReady
              ? "review ready"
              : "review evidence incomplete",
            publicationGateLabel(
              publicationReadiness?.publicationGateMode
            )
          ].join(" · ");
    }

    const reviews = productionReviews.reviews || [];
    if (!reviews.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent =
        "No production review notes yet. Add one against an exact current revision.";
      reviewList.replaceChildren(empty);
      return;
    }
    reviewList.replaceChildren(...reviews.map(renderProductionReview));
  }

  function renderProductionReview(review) {
    const card = document.createElement("article");
    card.className = "podcast-admin__review-card";
    if (!review.isCurrent) card.classList.add("is-stale");

    const heading = document.createElement("div");
    heading.className = "podcast-admin__transcript-cue-heading";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = review.targetLabel || humanizeCode(review.targetType);
    const evidence = document.createElement("p");
    evidence.className = "podcast-admin__review-evidence";
    evidence.textContent = [
      `revision ${Number(review.targetRevision)}`,
      review.isCurrent ? "current target" : "historical target",
      `review state ${humanizeCode(review.status)}`,
      review.assignedToAdminUserId === adminIdentity?.id
        ? "assigned to me"
        : review.assignedToAdminUserId
          ? "assigned to team member"
          : "unassigned"
    ].join(" · ");
    titleWrap.append(title, evidence);

    const controls = document.createElement("div");
    controls.className = "podcast-admin__review-controls";
    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Review state";
    const statusSelect = document.createElement("select");
    statusSelect.dataset.podcastReviewStatus = review.id;
    const statuses = [
      "draft",
      "ready_for_review",
      "changes_requested",
      "approved"
    ];
    statusSelect.replaceChildren(...statuses.map((status) =>
      new Option(
        humanizeCode(status),
        status,
        false,
        status === review.status
      )
    ));
    statusSelect.disabled = !canEditReviews
      || !review.isCurrent
      || (review.status === "approved" && !canApproveReviews);
    if (!canApproveReviews) {
      const approveOption = statusSelect.querySelector(
        'option[value="approved"]'
      );
      if (approveOption && review.status !== "approved") {
        approveOption.disabled = true;
      }
    }
    const hasOpenBlocker = (review.comments || []).some(
      ({ blocker, resolutionStatus }) =>
        blocker && resolutionStatus === "open"
    );
    if (hasOpenBlocker && review.status !== "approved") {
      const approveOption = statusSelect.querySelector(
        'option[value="approved"]'
      );
      if (approveOption) approveOption.disabled = true;
    }
    statusLabel.append(statusSelect);
    const assignLabel = document.createElement("label");
    assignLabel.className = "podcast-admin__checkbox";
    const assignInput = document.createElement("input");
    assignInput.type = "checkbox";
    assignInput.checked =
      review.assignedToAdminUserId === adminIdentity?.id;
    assignInput.disabled = !canEditReviews
      || !review.isCurrent
      || (review.status === "approved" && !canApproveReviews);
    assignInput.dataset.podcastReviewAssign = review.id;
    assignLabel.append(assignInput, document.createTextNode(" Assigned to me"));
    controls.append(statusLabel, assignLabel);
    heading.append(titleWrap, controls);

    const comments = document.createElement("div");
    comments.className = "podcast-admin__review-comments";
    for (const comment of review.comments || []) {
      comments.append(renderProductionReviewComment(review, comment));
    }
    card.append(heading, comments);
    return card;
  }

  function renderProductionReviewComment(review, comment) {
    const item = document.createElement("article");
    item.className = "podcast-admin__review-comment";
    if (comment.resolutionStatus === "resolved") {
      item.classList.add("is-resolved");
    }
    const meta = document.createElement("p");
    meta.className = "podcast-admin__review-evidence";
    const range = formatReviewRange(comment.startsAtMs, comment.endsAtMs);
    meta.textContent = [
      range,
      comment.blocker ? "release blocker" : "review note",
      humanizeCode(comment.resolutionStatus),
      comment.assignedToAdminUserId === adminIdentity?.id
        ? "assigned to me"
        : comment.assignedToAdminUserId
          ? "assigned to team member"
          : "unassigned"
    ].filter(Boolean).join(" · ");
    const body = document.createElement("p");
    body.className = "podcast-admin__review-body";
    body.textContent = comment.bodyText;
    const actions = document.createElement("div");
    actions.className = "podcast-admin__transcript-actions";
    if (comment.startsAtMs !== null) {
      const reuse = document.createElement("button");
      reuse.className = "btn btn-outline-light";
      reuse.type = "button";
      reuse.dataset.podcastReviewReuseRange = comment.id;
      reuse.dataset.startsAtMs = String(comment.startsAtMs);
      reuse.dataset.endsAtMs =
        comment.endsAtMs === null ? "" : String(comment.endsAtMs);
      reuse.textContent = "Use this range";
      actions.append(reuse);
    }
    if (canEditReviews) {
      const resolution = document.createElement("button");
      resolution.className = "btn btn-outline-light";
      resolution.type = "button";
      resolution.dataset.podcastReviewCommentState = comment.id;
      resolution.dataset.reviewId = review.id;
      resolution.dataset.revision = String(comment.revision);
      resolution.dataset.nextState =
        comment.resolutionStatus === "resolved" ? "open" : "resolved";
      resolution.dataset.assignedTo =
        comment.assignedToAdminUserId || "";
      resolution.textContent =
        comment.resolutionStatus === "resolved" ? "Reopen" : "Resolve";
      actions.append(resolution);
    }
    item.append(meta, body);
    if (actions.childElementCount) item.append(actions);
    return item;
  }

  async function createProductionReviewComment(event) {
    event.preventDefault();
    if (!productionReviews || !canEditReviews) return;
    const option = reviewTargetSelect.selectedOptions[0];
    if (!option) {
      setStatus(reviewStatus, "Choose a current review target.", true);
      return;
    }
    const button = reviewForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(reviewStatus, "Adding exact-revision review note…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${
          encodeURIComponent(reviewEpisodeSelect.value)
        }/reviews`,
        {
          method: "POST",
          body: {
            commentId: operationId("review_comment"),
            targetType: option.dataset.targetType,
            targetId: option.dataset.targetId,
            startsAtMs: optionalReviewMilliseconds(
              reviewForm.elements.startsAtSeconds.value,
              "Review start"
            ),
            endsAtMs: optionalReviewMilliseconds(
              reviewForm.elements.endsAtSeconds.value,
              "Review end"
            ),
            bodyText: reviewForm.elements.bodyText.value,
            blocker: reviewForm.elements.blocker.checked,
            assignedToAdminUserId:
              reviewForm.elements.assignToSelf.checked
                ? adminIdentity?.id
                : null
          }
        }
      );
      productionReviews = payload;
      reviewForm.elements.bodyText.value = "";
      reviewForm.elements.startsAtSeconds.value = "";
      reviewForm.elements.endsAtSeconds.value = "";
      reviewForm.elements.blocker.checked = false;
      renderProductionReviews();
      setStatus(reviewStatus, "Production review note added.");
      await loadPublicationReadiness();
    } catch (error) {
      setStatus(
        reviewStatus,
        error instanceof AdminApiError
          ? friendlyError(error)
          : reviewInputError(error),
        true
      );
    } finally {
      button.disabled = false;
    }
  }

  function handleProductionReviewChange(event) {
    const status = event.target.closest("[data-podcast-review-status]");
    if (status) {
      const review = productionReviews?.reviews?.find(
        ({ id }) => id === status.dataset.podcastReviewStatus
      );
      if (review) {
        updateProductionReview(review, {
          status: status.value,
          assignedToAdminUserId: review.assignedToAdminUserId
        });
      }
      return;
    }
    const assignment = event.target.closest("[data-podcast-review-assign]");
    if (assignment) {
      const review = productionReviews?.reviews?.find(
        ({ id }) => id === assignment.dataset.podcastReviewAssign
      );
      if (review) {
        updateProductionReview(review, {
          status: review.status,
          assignedToAdminUserId: assignment.checked
            ? adminIdentity?.id
            : null
        });
      }
    }
  }

  function handleProductionReviewClick(event) {
    const range = event.target.closest("[data-podcast-review-reuse-range]");
    if (range) {
      reviewForm.elements.startsAtSeconds.value = millisecondsToSeconds(
        Number(range.dataset.startsAtMs)
      );
      reviewForm.elements.endsAtSeconds.value = range.dataset.endsAtMs
        ? millisecondsToSeconds(Number(range.dataset.endsAtMs))
        : "";
      reviewForm.elements.bodyText.focus();
      return;
    }
    const state = event.target.closest(
      "[data-podcast-review-comment-state]"
    );
    if (state) updateProductionReviewComment(state);
  }

  async function updateProductionReview(
    review,
    { status, assignedToAdminUserId }
  ) {
    if (!canEditReviews) return;
    setStatus(reviewStatus, "Saving production review state…");
    try {
      const payload = await client.request(
        `/v1/admin/reviews/${encodeURIComponent(review.id)}`,
        {
          method: "PATCH",
          body: {
            mutationId: operationId("review_state"),
            baseRevision: Number(review.revision),
            status,
            assignedToAdminUserId
          }
        }
      );
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, "Production review state saved.");
      await loadPublicationReadiness();
    } catch (error) {
      renderProductionReviews();
      setStatus(reviewStatus, friendlyError(error), true);
    }
  }

  async function updateProductionReviewComment(button) {
    button.disabled = true;
    setStatus(reviewStatus, "Updating review-note state…");
    try {
      const payload = await client.request(
        `/v1/admin/review-comments/${
          encodeURIComponent(button.dataset.podcastReviewCommentState)
        }`,
        {
          method: "PATCH",
          body: {
            mutationId: operationId("review_comment_state"),
            baseRevision: Number(button.dataset.revision),
            resolutionStatus: button.dataset.nextState,
            assignedToAdminUserId: button.dataset.assignedTo || null
          }
        }
      );
      productionReviews = payload;
      renderProductionReviews();
      setStatus(reviewStatus, "Review-note state updated.");
      await loadPublicationReadiness();
    } catch (error) {
      setStatus(reviewStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadClips({ preserveStatus = false } = {}) {
    const episodeId = transcriptEpisodeSelect?.value;
    clipRequestId += 1;
    const requestId = clipRequestId;
    if (!episodeId) {
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      return;
    }
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/clips`
      );
      if (requestId !== clipRequestId) return;
      clips = payload.clips || [];
      selectedClipId = clips.some(({ id }) => id === selectedClipId)
        ? selectedClipId
        : "";
      renderClipList();
      if (selectedClipId) {
        fillClipRecipe(
          clips.find(({ id }) => id === selectedClipId)
        );
      } else {
        resetClipRecipe();
      }
      if (!preserveStatus) setStatus(clipStatus, "");
    } catch (error) {
      if (requestId !== clipRequestId) return;
      clips = [];
      selectedClipId = "";
      clipList?.replaceChildren();
      updateClipAvailability();
      setStatus(clipStatus, friendlyError(error), true);
    }
  }

  function renderClipList() {
    if (!clipList) return;
    releaseClipMediaPlayers(clipList);
    if (!clips.length) {
      clipList.innerHTML =
        '<p class="podcast-admin__empty">No saved clip recipes yet.</p>';
      return;
    }
    clipList.replaceChildren(...clips.map((clip) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__card";
      const media = clipRenderPresentation(clip, "production");
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(clip.status)} · revision ${Number(clip.revision)}</p>
          <h3>${escapeHtml(clip.title)}</h3>
          <p>${escapeHtml(clip.aspectRatio)} · ${formatClipDuration(clip.durationMs)} · ${escapeHtml(humanizeCode(clip.boundaryMode))}</p>
          <p>Private render: ${escapeHtml(media.renderLabel)}</p>
          ${media.details}
        </div>
        <div class="podcast-admin__clip-actions">
          <button
            class="btn btn-outline-light"
            type="button"
            data-podcast-clip-edit="${escapeAttribute(clip.id)}"
            ${canEditTranscripts ? "" : "disabled"}>
            Edit recipe
          </button>
          ${media.actions}
        </div>
        ${media.container}`;
      return row;
    }));
  }

  async function loadClipLibrary({ reset = true } = {}) {
    if (!clipLibrary || !clipLibraryFilters) return;
    if (!selectedShowId) {
      clearClipLibraryState();
      setStatus(clipLibraryStatus, "Choose a show to view its clip library.");
      return;
    }
    if (!reset && (clipLibraryLoading || !clipLibraryCursor)) return;
    const requestId = ++clipLibraryRequestId;
    const cursor = reset ? null : clipLibraryCursor;
    if (reset) {
      clipLibraryRows = [];
      clipLibraryCursor = null;
      releaseClipMediaPlayers(clipLibrary);
      clipLibrary.replaceChildren();
    }
    clipLibraryLoading = true;
    setStatus(
      clipLibraryStatus,
      reset ? "Loading private clip library…" : "Loading more clips…"
    );
    const params = new URLSearchParams({ limit: "24" });
    for (const field of ["episodeId", "aspectRatio", "renderStatus"]) {
      const value = clipLibraryFilters.elements[field]?.value;
      if (value) params.set(field, value);
    }
    if (cursor) params.set("cursor", cursor);
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(selectedShowId)}/clips?${params}`
      );
      if (requestId !== clipLibraryRequestId) return;
      const page = payload.clips || [];
      clipLibraryRows = reset
        ? page
        : [...clipLibraryRows, ...page];
      clipLibraryCursor = payload.pagination?.nextCursor || null;
      renderClipLibrary();
      setStatus(
        clipLibraryStatus,
        `${formatInteger(clipLibraryRows.length)} clip`
        + `${clipLibraryRows.length === 1 ? "" : "s"} loaded.`
      );
    } catch (error) {
      if (requestId !== clipLibraryRequestId) return;
      if (reset) {
        clipLibraryRows = [];
        clipLibraryCursor = null;
        clipLibrary.replaceChildren();
      }
      setStatus(clipLibraryStatus, friendlyError(error), true);
    } finally {
      if (requestId === clipLibraryRequestId) {
        clipLibraryLoading = false;
      }
    }
  }

  function clearClipLibraryState() {
    clipLibraryRows = [];
    clipLibraryCursor = null;
    clipLibraryLoading = false;
    clipLibraryRequestId += 1;
    releaseClipMediaPlayers(clipLibrary);
    clipLibrary?.replaceChildren();
    setStatus(clipLibraryStatus, "");
  }

  function renderClipLibrary() {
    if (!clipLibrary) return;
    releaseClipMediaPlayers(clipLibrary);
    if (!clipLibraryRows.length) {
      clipLibrary.innerHTML =
        '<p class="podcast-admin__empty">No clips match these filters.</p>';
      return;
    }
    const cards = clipLibraryRows.map((clip) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__card";
      const media = clipRenderPresentation(clip, "marketing");
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(clip.episodeTitle || "Episode")} · ${escapeHtml(clip.aspectRatio)}</p>
          <h3>${escapeHtml(clip.title)}</h3>
          <p>${formatClipDuration(clip.durationMs)} · ${escapeHtml(humanizeCode(clip.captionLanguage))} · revision ${Number(clip.revision)}</p>
          <p>Private render: ${escapeHtml(media.renderLabel)}</p>
          ${media.details}
        </div>
        <div class="podcast-admin__clip-actions">${media.actions}</div>
        ${media.container}`;
      return row;
    });
    clipLibrary.replaceChildren(...cards);
    if (clipLibraryCursor) {
      const more = document.createElement("button");
      more.className = "btn btn-outline-light podcast-admin__more";
      more.type = "button";
      more.dataset.podcastClipLibraryMore = "";
      more.textContent = "Load more clips";
      clipLibrary.append(more);
    }
  }

  function clipRenderPresentation(clip, surface) {
    const render = clip.render;
    const youtubePublication = clip.youtubePublication;
    const youtubeDetails = youtubePublication
      ? `<p>YouTube test: ${escapeHtml(humanizeCode(youtubePublication.status))}
          · ${escapeHtml(humanizeCode(youtubePublication.privacyStatus))}</p>`
      : "";
    const renderLabel = !render
      ? "not requested"
      : render.clipRevision === clip.revision
        ? humanizeCode(render.status)
        : `${humanizeCode(render.status)} for older revision ${Number(render.clipRevision)}`;
    const mediaUrl = adminApiUrl(render?.mediaPath);
    const downloadUrl = adminApiUrl(render?.downloadPath);
    const ready = render
      && render.clipRevision === clip.revision
      && render.status === "ready"
      && mediaUrl
      && downloadUrl;
    if (!ready) {
      return {
        renderLabel,
        details: youtubeDetails,
        actions: "",
        container: ""
      };
    }
    const previewId =
      `${surface}-clip-render-preview-${render.id}`;
    const youtubeAction = canEditTranscripts
      ? `<button
          class="btn btn-outline-light"
          type="button"
          data-podcast-clip-youtube-open="${escapeAttribute(clip.id)}">
          ${youtubePublication ? "Review YouTube test" : "Prepare YouTube test"}
        </button>`
      : "";
    return {
      renderLabel,
      details: `
        <p>
          ${Number(render.width)}×${Number(render.height)}
          · ${formatClipDuration(Number(render.durationMs))}
          · ${formatInteger(render.outputBytes)} bytes
        </p>
        ${youtubeDetails}`,
      actions: `
        <button
          class="btn btn-outline-light"
          type="button"
          aria-controls="${escapeAttribute(previewId)}"
          aria-expanded="false"
          data-podcast-clip-render-preview
          data-media-path="${escapeAttribute(render.mediaPath)}">
          Preview render
        </button>
        <a
          class="btn btn-outline-light"
          href="${escapeAttribute(downloadUrl)}"
          download>
          Download MP4
        </a>
        ${youtubeAction}`,
      container: `<div
        id="${escapeAttribute(previewId)}"
        class="podcast-admin__clip-media"
        data-podcast-clip-media
        hidden></div>`
    };
  }

  function handleClipAction(event, { editable = false } = {}) {
    const youtube = event.target.closest(
      "[data-podcast-clip-youtube-open]"
    );
    if (youtube) {
      openClipYouTubeForm(youtube.dataset.podcastClipYoutubeOpen);
      return true;
    }
    const preview = event.target.closest(
      "[data-podcast-clip-render-preview]"
    );
    if (preview) {
      toggleClipRenderPreview(preview);
      return true;
    }
    const edit = editable
      ? event.target.closest("[data-podcast-clip-edit]")
      : null;
    if (edit) {
      selectClipRecipe(edit.dataset.podcastClipEdit);
      return true;
    }
    return false;
  }

  function toggleClipRenderPreview(button) {
    const row = button.closest(".podcast-admin__card");
    const container = row?.querySelector("[data-podcast-clip-media]");
    const status = button.closest("#podcast-panel-marketing")
      ? clipLibraryStatus
      : clipStatus;
    if (!container) return;
    if (!container.hidden) {
      releaseClipMediaPlayers(container);
      container.hidden = true;
      button.textContent = "Preview render";
      button.setAttribute("aria-expanded", "false");
      return;
    }
    const mediaUrl = adminApiUrl(button.dataset.mediaPath);
    if (!mediaUrl) {
      setStatus(status, "The private render URL is invalid.", true);
      return;
    }
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    video.crossOrigin = "use-credentials";
    video.src = mediaUrl;
    video.setAttribute("aria-label", "Private captioned clip preview");
    video.addEventListener("error", () => {
      if (video.dataset.releasing === "1") return;
      setStatus(
        status,
        "The private render could not be loaded. Refresh your session and verify the render evidence.",
        true
      );
    }, { once: true });
    container.replaceChildren(video);
    container.hidden = false;
    button.textContent = "Hide preview";
    button.setAttribute("aria-expanded", "true");
  }

  function releaseClipMediaPlayers(container) {
    container?.querySelectorAll("video").forEach((video) => {
      video.dataset.releasing = "1";
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  }

  function pauseClipMediaPlayers(container) {
    container?.querySelectorAll("video").forEach((video) => video.pause());
  }

  function openClipYouTubeForm(clipId) {
    if (!clipYouTubeForm) return;
    const clip = [...clipLibraryRows, ...clips].find(
      (candidate) => candidate.id === clipId
    );
    if (
      !clip
      || clip.render?.status !== "ready"
      || clip.render?.clipRevision !== clip.revision
    ) {
      setStatus(
        clipLibraryStatus,
        "Only the current completed render can prepare a YouTube test.",
        true
      );
      return;
    }
    selectedClipYouTube = clip;
    const publication = clip.youtubePublication;
    clipYouTubePublicationId =
      publication?.id || operationId("clip_youtube");
    const show = shows.find(({ id }) => id === selectedShowId);
    clipYouTubeForm.elements.title.value = publication?.title
      || `${String(clip.title || "").slice(0, 92)} #Shorts`;
    clipYouTubeForm.elements.description.value =
      publication?.description || "";
    clipYouTubeForm.elements.privacyStatus.value =
      publication?.privacyStatus || "unlisted";
    clipYouTubeForm.elements.confirmChannelUrl.value =
      publication?.channelUrl || show?.youtubeChannelUrl || "";
    const immutable = Boolean(publication);
    for (const field of [
      "title",
      "description",
      "privacyStatus",
      "confirmChannelUrl"
    ]) {
      clipYouTubeForm.elements[field].disabled = immutable;
    }
    const save = clipYouTubeForm.querySelector(
      "[data-podcast-clip-youtube-save]"
    );
    if (save) save.hidden = immutable;
    if (clipYouTubeApprove) {
      clipYouTubeApprove.hidden = !(
        canApproveClipYouTube
        && ["draft", "dry_run"].includes(publication?.status)
      );
    }
    if (clipYouTubeMeta) {
      clipYouTubeMeta.textContent = [
        clip.episodeTitle || "Episode",
        clip.title,
        `render ${clip.render.id}`,
        publication
          ? `${humanizeCode(publication.status)} · ${humanizeCode(publication.privacyStatus)}`
          : "new immutable draft"
      ].join(" · ");
    }
    setStatus(clipYouTubeStatus, "");
    clipYouTubeForm.hidden = false;
    clipYouTubeForm.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  async function saveClipYouTubeDraft(event) {
    event.preventDefault();
    const clip = selectedClipYouTube;
    const button = clipYouTubeForm?.querySelector(
      "[data-podcast-clip-youtube-save]"
    );
    if (!clip?.render || !button) return;
    button.disabled = true;
    setStatus(
      clipYouTubeStatus,
      "Preparing immutable private/unlisted YouTube draft…"
    );
    try {
      const payload = await client.request(
        `/v1/admin/clip-renders/${encodeURIComponent(clip.render.id)}/youtube`,
        {
          method: "POST",
          body: {
            publicationId: clipYouTubePublicationId,
            expectedClipRevision: Number(clip.revision),
            title: clipYouTubeForm.elements.title.value,
            description: clipYouTubeForm.elements.description.value,
            privacyStatus:
              clipYouTubeForm.elements.privacyStatus.value,
            confirmChannelUrl:
              clipYouTubeForm.elements.confirmChannelUrl.value
          }
        }
      );
      applyClipYouTubePublication(
        clip.render.id,
        payload.publication
      );
      renderClipList();
      renderClipLibrary();
      openClipYouTubeForm(clip.id);
      setStatus(
        clipYouTubeStatus,
        payload.idempotent
          ? "This immutable YouTube draft already exists."
          : "Draft prepared. No upload occurred."
      );
    } catch (error) {
      setStatus(clipYouTubeStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function approveClipYouTubePublication() {
    const clip = selectedClipYouTube;
    const publication = clip?.youtubePublication;
    if (!clip || !publication || !clipYouTubeApprove) return;
    clipYouTubeApprove.disabled = true;
    setStatus(
      clipYouTubeStatus,
      "Approving the current controlled-test gate…"
    );
    try {
      const payload = await client.request(
        `/v1/admin/clip-youtube-publications/${encodeURIComponent(publication.id)}/approve`,
        { method: "POST", body: {} }
      );
      applyClipYouTubePublication(
        publication.renderId || clip.render?.id,
        payload.publication
      );
      renderClipList();
      renderClipLibrary();
      openClipYouTubeForm(clip.id);
      setStatus(
        clipYouTubeStatus,
        payload.publication.status === "dry_run"
          ? "Dry-run approved. No provider upload occurred."
          : `Controlled private/unlisted upload accepted: ${humanizeCode(payload.publication.status)}.`
      );
    } catch (error) {
      setStatus(clipYouTubeStatus, friendlyError(error), true);
    } finally {
      clipYouTubeApprove.disabled = false;
    }
  }

  function applyClipYouTubePublication(renderId, publication) {
    if (!renderId || !publication) return;
    for (const collection of [clips, clipLibraryRows]) {
      for (const clip of collection) {
        if (clip.render?.id === renderId) {
          clip.youtubePublication = publication;
        }
      }
    }
    if (selectedClipYouTube?.render?.id === renderId) {
      selectedClipYouTube.youtubePublication = publication;
    }
  }

  function closeClipYouTubeForm() {
    selectedClipYouTube = null;
    clipYouTubePublicationId = "";
    clipYouTubeForm?.reset();
    if (clipYouTubeForm) clipYouTubeForm.hidden = true;
    setStatus(clipYouTubeStatus, "");
  }

  function adminApiUrl(path) {
    if (
      !/^\/v1\/admin\/clip-renders\/[A-Za-z0-9_-]+\/media(?:\?download=1)?$/
        .test(path || "")
    ) {
      return "";
    }
    try {
      const apiBase = new URL(`${apiOrigin.replace(/\/+$/, "")}/`);
      const url = new URL(path, apiBase);
      return url.origin === apiBase.origin ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function resetClipRecipe() {
    selectedClipId = "";
    clipForm?.reset();
    if (clipForm) {
      clipForm.elements.boundaryMode.value = "segment";
      clipForm.elements.templateId.value = "captioned-waveform-v1";
    }
    fillClipCueSelects();
    refreshClipRecipe();
  }

  function selectClipRecipe(clipId) {
    const clip = clips.find(({ id }) => id === clipId);
    if (!clip) return;
    selectedClipId = clip.id;
    fillClipRecipe(clip);
    clipForm?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function fillClipRecipe(clip) {
    if (!clipForm || !clip) return;
    clipForm.elements.title.value = clip.title || "";
    clipForm.elements.aspectRatio.value = clip.aspectRatio || "9:16";
    clipForm.elements.boundaryMode.value = clip.boundaryMode || "segment";
    clipForm.elements.templateId.value =
      clip.templateId || "captioned-waveform-v1";
    fillClipCueSelects({
      startCueId: clip.selection?.startCueId,
      endCueId: clip.selection?.endCueId
    });
    refreshClipRecipe();
  }

  function fillClipCueSelects({
    startCueId = clipForm?.elements.startCueId.value,
    endCueId = clipForm?.elements.endCueId.value
  } = {}) {
    if (!clipForm) return;
    const cues = transcript?.cues || [];
    const options = (selectedId) => cues.map((cue, index) =>
      new Option(
        `${index + 1} · ${millisecondsToTimestamp(cue.startsAtMs)}–${millisecondsToTimestamp(cue.endsAtMs)} · ${clipCueSummary(cue.textMarkdown)}`,
        cue.id,
        false,
        cue.id === selectedId
      )
    );
    clipForm.elements.startCueId.replaceChildren(...options(startCueId));
    clipForm.elements.endCueId.replaceChildren(...options(endCueId));
    if (
      !cues.some(({ id }) => id === clipForm.elements.startCueId.value)
      && cues[0]
    ) {
      clipForm.elements.startCueId.value = cues[0].id;
    }
    if (
      !cues.some(({ id }) => id === clipForm.elements.endCueId.value)
      && cues[0]
    ) {
      clipForm.elements.endCueId.value = cues[0].id;
    }
  }

  function updateClipAvailability() {
    if (!clipForm) return;
    const selected = clips.find(({ id }) => id === selectedClipId);
    const transcriptApproved = transcript
      && transcript.status === "approved"
      && Number(transcript.approvedRevision) === Number(transcript.revision)
      && !transcriptDirty;
    const canSave = Boolean(canEditTranscripts && transcriptApproved);
    const selection = selectedClipCueRange();
    const selectionIsValid = selection
      && selection.durationMs >= 1_000
      && selection.durationMs <= 180_000;
    for (const control of [
      clipForm.elements.title,
      clipForm.elements.aspectRatio,
      clipForm.elements.startCueId,
      clipForm.elements.endCueId
    ]) {
      control.disabled = !canSave;
    }
    clipForm.elements.boundaryMode.disabled = true;
    clipForm.elements.templateId.disabled = true;
    clipForm.querySelector('button[type="submit"]').disabled =
      !canSave || !selectionIsValid;
    if (clipNewButton) clipNewButton.disabled = !canSave;
    const renderMatchesCurrent = selected
      && selected.render?.clipRevision === selected.revision;
    if (clipRenderButton) {
      clipRenderButton.disabled = !canSave
        || !selectionIsValid
        || !selected
        || Number(selected.revision || 0) < 1
        || selected.transcriptSha256 !== transcript?.contentSha256
        || (
          renderMatchesCurrent
          && selected.render?.status === "ready"
        );
    }
    if (!transcriptApproved) {
      if (clipPreview) {
        clipPreview.textContent = transcriptDirty
          ? "Save and approve the current transcript edits before creating a clip."
          : "Approve this transcript revision before creating a clip.";
      }
    }
  }

  function refreshClipRecipe() {
    updateClipPreview();
    updateClipAvailability();
  }

  function selectedClipCueRange() {
    if (!clipForm) return null;
    const cues = transcript?.cues || [];
    const startIndex = cues.findIndex(
      ({ id }) => id === clipForm.elements.startCueId.value
    );
    const endIndex = cues.findIndex(
      ({ id }) => id === clipForm.elements.endCueId.value
    );
    if (startIndex < 0 || endIndex < startIndex) return null;
    const startsAtMs = Number(cues[startIndex].startsAtMs);
    const endsAtMs = Number(cues[endIndex].endsAtMs);
    return {
      startsAtMs,
      endsAtMs,
      durationMs: endsAtMs - startsAtMs
    };
  }

  function updateClipPreview() {
    if (!clipForm || !clipPreview) return;
    const selection = selectedClipCueRange();
    if (!selection) {
      clipPreview.textContent =
        "Choose an end cue at or after the start cue.";
      return;
    }
    const { startsAtMs, endsAtMs, durationMs } = selection;
    if (durationMs < 1_000 || durationMs > 180_000) {
      clipPreview.textContent =
        "Clip range must be between 1 second and 3 minutes.";
      return;
    }
    const dimensions = clipForm.elements.aspectRatio.value === "9:16"
      ? "1080×1920"
      : clipForm.elements.aspectRatio.value === "1:1"
        ? "1080×1080"
        : "1920×1080";
    clipPreview.textContent = [
      `${millisecondsToTimestamp(startsAtMs)}–${millisecondsToTimestamp(endsAtMs)}`,
      formatClipDuration(durationMs),
      dimensions,
      "high-contrast captions",
      "8% side/top and 18% bottom safe area"
    ].join(" · ");
  }

  async function saveClipRecipe(event) {
    event.preventDefault();
    const selected = clips.find(({ id }) => id === selectedClipId);
    const clipId = selected?.id || operationId("clip");
    const button = clipForm.querySelector('button[type="submit"]');
    button.disabled = true;
    clipRenderButton.disabled = true;
    setStatus(clipStatus, "Saving immutable clip recipe revision…");
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(transcriptEpisodeSelect.value)}/clips/${encodeURIComponent(clipId)}`,
        {
          method: "PUT",
          body: {
            mutationId: operationId("clip_mutation"),
            baseRevision: Number(selected?.revision || 0),
            title: clipForm.elements.title.value,
            captionLanguage: transcriptLanguageSelect.value,
            aspectRatio: clipForm.elements.aspectRatio.value,
            templateId: "captioned-waveform-v1",
            boundaryMode: "segment",
            startCueId: clipForm.elements.startCueId.value,
            endCueId: clipForm.elements.endCueId.value
          }
        }
      );
      selectedClipId = payload.clip.id;
      await loadClips({ preserveStatus: true });
      setStatus(
        clipStatus,
        "Clip recipe saved. Word cuts and public upload remain locked."
      );
      await refreshReviewEvidenceForEpisode(
        transcriptEpisodeSelect.value
      );
    } catch (error) {
      setStatus(clipStatus, friendlyError(error), true);
      updateClipAvailability();
    }
  }

  async function prepareClipRender() {
    const clip = clips.find(({ id }) => id === selectedClipId);
    if (!clip) return;
    clipRenderButton.disabled = true;
    setStatus(clipStatus, "Preparing checksummed private render manifest…");
    try {
      const renderId = clip.render?.clipRevision === clip.revision
        ? clip.render.id
        : operationId("clip_render");
      const payload = await client.request(
        `/v1/admin/clips/${encodeURIComponent(clip.id)}/render`,
        {
          method: "POST",
          body: {
            renderId,
            expectedRevision: Number(clip.revision)
          }
        }
      );
      downloadJson(
        `podcast-clip-${clip.id}-revision-${clip.revision}.json`,
        payload.processorManifest
      );
      await loadClips({ preserveStatus: true });
      setStatus(
        clipStatus,
        payload.idempotent
          ? "Existing private processor manifest downloaded again."
          : "Private processor manifest created and downloaded. This is not a completed render."
      );
    } catch (error) {
      setStatus(clipStatus, friendlyError(error), true);
      updateClipAvailability();
    }
  }

  function updateAdPlanFields() {
    if (!adPlanForm) return;
    const enabled = adPlanForm.elements.midRoll.checked;
    adPlanForm.elements.midRollSeconds.disabled = !enabled;
    adPlanForm.elements.midRollSeconds.required = enabled;
  }

  async function loadAdPlan({ preserveStatus = false } = {}) {
    const episodeId = adPlanForm?.elements.episodeId.value;
    latestProcessorManifest = null;
    if (!episodeId) {
      adPlanResult?.replaceChildren();
      return;
    }
    adPlanResult.innerHTML = "<p>Loading marker and segment state…</p>";
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/ad-plan`
      );
      latestProcessorManifest = payload.processorManifest || null;
      renderAdPlan(payload);
      if (!preserveStatus) setStatus(adPlanStatus, "");
    } catch (error) {
      adPlanResult.textContent = friendlyError(error);
    }
  }

  function renderAdPlan(payload) {
    const plan = payload.latestPlan;
    const source = payload.source || {};
    const markers = payload.active?.markers || [];
    const segments = payload.active?.segments || [];
    const canApprove = canManageAdPlans && plan?.status === "needs_review";
    const canReject = canManageAdPlans
      && plan
      && !["approved", "superseded", "rejected"].includes(plan.status);
    const card = document.createElement("article");
    card.className = "podcast-admin__decision";
    card.innerHTML = `
      <div>
        <p class="podcast-admin__pill">${escapeHtml(plan?.status || "no plan")}</p>
        <h3>${plan ? `Ad plan revision ${Number(plan.revision)}` : "No marker plan yet"}</h3>
        <p>Delivery source: ${source.ready ? "ready" : "not ready"} · ${Number(source.bytes || 0)} bytes · ${Number(source.durationSeconds || 0)} seconds</p>
        <p>Processor: ${escapeHtml(plan?.processorVersion || "awaiting evidence")}</p>
        <p>Proposed segments: ${Number(plan?.segmentCount || 0)} · Active approved markers: ${markers.length} · Active ready segments: ${segments.filter(({ validationStatus }) => validationStatus === "ready").length}</p>
      </div>
      <div>
        <h3>Review controls</h3>
        <p>Approval replaces active marker/segment rows atomically but leaves request-time ads disabled.</p>
        <div class="podcast-admin__episode-actions">
          <button class="btn btn-outline-light" type="button" data-download-ad-plan ${latestProcessorManifest ? "" : "disabled"}>Download processor manifest</button>
          <button class="btn btn-outline-light" type="button" data-approve-ad-plan="${escapeAttribute(plan?.id || "")}" ${canApprove ? "" : "disabled"}>Approve evidence</button>
          <button class="btn btn-danger" type="button" data-reject-ad-plan="${escapeAttribute(plan?.id || "")}" ${canReject ? "" : "disabled"}>Reject</button>
        </div>
      </div>`;
    adPlanResult.replaceChildren(card);
  }

  async function submitAdPlan(event) {
    event.preventDefault();
    const markers = [];
    if (adPlanForm.elements.preRoll.checked) {
      markers.push({ position: "pre" });
    }
    if (adPlanForm.elements.midRoll.checked) {
      markers.push({
        position: "mid",
        startsAtMs: Math.round(
          Number(adPlanForm.elements.midRollSeconds.value) * 1_000
        )
      });
    }
    if (adPlanForm.elements.postRoll.checked) {
      markers.push({ position: "post" });
    }
    if (markers.length === 0) {
      setStatus(adPlanStatus, "Select at least one ad position.", true);
      return;
    }
    const button = adPlanForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(adPlanStatus, "Submitting immutable marker intent…");
    try {
      const created = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(adPlanForm.elements.episodeId.value)}/ad-plan`,
        {
          method: "POST",
          body: {
            streamProfile: "mp3-44100-stereo-cbr128-frame-v1",
            markers
          }
        }
      );
      latestProcessorManifest = created.processorManifest;
      setStatus(
        adPlanStatus,
        "Plan submitted. Download its manifest for the isolated staging processor; review is required after evidence returns."
      );
      await loadAdPlan({ preserveStatus: true });
      await refreshReviewEvidenceForEpisode(
        adPlanForm.elements.episodeId.value
      );
    } catch (error) {
      setStatus(adPlanStatus, friendlyError(error), true);
    } finally {
      button.disabled = episodes.length === 0;
    }
  }

  async function handleAdPlanAction(event) {
    const downloadButton = event.target.closest("[data-download-ad-plan]");
    if (downloadButton) {
      if (!latestProcessorManifest) return;
      downloadJson(
        `podcast-ad-plan-${latestProcessorManifest.planId}.json`,
        latestProcessorManifest
      );
      setStatus(adPlanStatus, "Processor manifest downloaded.");
      return;
    }
    const approveButton = event.target.closest("[data-approve-ad-plan]");
    const rejectButton = event.target.closest("[data-reject-ad-plan]");
    const button = approveButton || rejectButton;
    if (!button) return;
    const planId = approveButton
      ? approveButton.dataset.approveAdPlan
      : rejectButton.dataset.rejectAdPlan;
    const reason = rejectButton
      ? globalThis.prompt("Why is this marker/segment evidence being rejected?")
      : null;
    if (rejectButton && !reason?.trim()) return;
    button.disabled = true;
    setStatus(
      adPlanStatus,
      approveButton ? "Rechecking R2 evidence…" : "Rejecting plan…"
    );
    try {
      await client.request(
        `/v1/admin/ads/plans/${encodeURIComponent(planId)}/${approveButton ? "approve" : "reject"}`,
        {
          method: "POST",
          body: approveButton ? {} : { reason: reason.trim() }
        }
      );
      setStatus(
        adPlanStatus,
        approveButton
          ? "Marker and program-segment evidence approved. Runtime ads remain disabled."
          : "Plan rejected."
      );
      await loadAdPlan({ preserveStatus: true });
      await refreshReviewEvidenceForEpisode(
        adPlanForm.elements.episodeId.value
      );
    } catch (error) {
      setStatus(adPlanStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function publishEpisode(episodeId, button) {
    button.disabled = true;
    setStatus(episodeStatus, "Refreshing exact publication evidence…");
    try {
      const readiness = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/readiness`
      );
      if (episodeId === reviewEpisodeSelect?.value) {
        publicationReadiness = readiness;
        renderPublicationReadiness();
      }
      const mode = String(readiness.publicationGateMode || "legacy");
      const candidate = readiness.candidateGate || {};
      const body = mode === "legacy"
        ? {}
        : {
            snapshotDigest: String(readiness.snapshotDigest || ""),
            basePublicationRevision: Number(
              readiness.publicationRevision || 0
            )
          };
      if (mode === "enforce" && !candidate.ready) {
        if (!candidate.overrideAvailable) {
          throw new AdminApiError(
            "Resolve the publication blockers or ask an Admin to review them.",
            {
              status: 409,
              code: "publication_not_ready",
              details: readiness
            }
          );
        }
        const blockerLabels = (readiness.nodes || [])
          .filter((node) =>
            node.severity === "blocker"
            && !["ready", "not_applicable"].includes(node.status)
          )
          .map((node) => String(node.label || "Unresolved dependency"));
        const reason = globalThis.prompt(
          [
            `${blockerLabels.length} publication blocker${
              blockerLabels.length === 1 ? "" : "s"
            } ${blockerLabels.length === 1 ? "remains" : "remain"}:`,
            blockerLabels.join("; "),
            "",
            "Enter the private override reason (500 characters maximum)."
          ].join("\n")
        );
        if (reason === null) {
          setStatus(episodeStatus, "Publication override canceled.");
          return;
        }
        const normalizedReason = reason
          .normalize("NFKC")
          .replace(/\s+/g, " ")
          .trim();
        if (!normalizedReason || normalizedReason.length > 500) {
          throw new AdminApiError(
            "Enter a private override reason between 1 and 500 characters.",
            { status: 400, code: "publication_override_reason_invalid" }
          );
        }
        const confirmed = globalThis.confirm(
          "Publish this exact snapshot with unresolved blockers? "
          + "Your identity, reason hash, and evidence counts will be audited."
        );
        if (!confirmed) {
          setStatus(episodeStatus, "Publication override canceled.");
          return;
        }
        body.override = {
          id: operationId("publication_override"),
          reason: normalizedReason,
          confirmation: "PUBLISH_WITH_BLOCKERS"
        };
      }
      setStatus(
        episodeStatus,
        mode === "enforce"
          ? "Publishing the exact enforced snapshot…"
          : mode === "shadow"
            ? "Publishing while comparing the shadow snapshot…"
            : "Publishing with legacy checks…"
      );
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/publish`,
        { method: "POST", body }
      );
      const gate = result.publicationGate || {};
      setStatus(
        episodeStatus,
        result.idempotent
          ? `Already published as revision ${result.publicationRevision}; no duplicate work was created.`
          : [
              `Revision ${result.publicationRevision} ${result.status}.`,
              `${result.distributionTargets} directory states created.`,
              gate.overridden
                ? "Candidate blockers were explicitly overridden and audited."
                : gate.mode === "shadow"
                  ? gate.snapshotMatched
                    ? "Shadow snapshot matched."
                    : "Shadow snapshot mismatch recorded without enforcement."
                  : ""
            ].filter(Boolean).join(" ")
      );
      await loadEpisodes();
      if (distributionFilter) {
        distributionFilter.elements.episodeId.value = episodeId;
      }
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(episodeStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadDistribution(episodeId) {
    if (!distributionRoot || !selectedShowId) return;
    const selectedEpisodeId = episodeId
      ?? distributionFilter?.elements.episodeId?.value
      ?? "";
    const requestId = ++distributionRequestId;
    const requestedShowId = selectedShowId;
    const loading = document.createElement("p");
    loading.textContent = "Loading distribution state…";
    distributionRoot.replaceChildren(loading);
    try {
      const path = selectedEpisodeId
        ? `/v1/admin/episodes/${encodeURIComponent(
          selectedEpisodeId
        )}/distribution`
        : `/v1/admin/distribution?showId=${encodeURIComponent(
          requestedShowId
        )}`;
      const payload = await client.request(path);
      if (
        requestId !== distributionRequestId
        || requestedShowId !== selectedShowId
      ) return;
      renderDistribution(payload);
    } catch (error) {
      if (
        requestId === distributionRequestId
        && requestedShowId === selectedShowId
      ) {
        distributionRoot.textContent = friendlyError(error);
      }
    }
  }

  function renderDistribution(payload) {
    const destinations = Array.isArray(payload.destinations)
      ? payload.destinations
      : [];
    const summary = payload.summary || {};
    const fragment = document.createDocumentFragment();
    if (payload.release) {
      fragment.append(
        renderReleaseChannels(payload.release, payload.episodeId || "")
      );
    }
    const overview = document.createElement("div");
    overview.className =
      "podcast-admin__metric-grid podcast-admin__distribution-summary";
    for (const [value, label] of [
      [summary.total, "Launch directories"],
      [summary.setupComplete, "Owner setup complete"],
      [summary.setupRequired, "Owner setup required"],
      [summary.observed, "Episode observed"]
    ]) {
      const card = document.createElement("article");
      const strong = document.createElement("strong");
      strong.textContent = Number.isFinite(Number(value))
        ? String(Number(value))
        : "—";
      const span = document.createElement("span");
      span.textContent = label;
      card.append(strong, span);
      overview.append(card);
    }
    fragment.append(overview);

    const feed = document.createElement("div");
    feed.className = "podcast-admin__distribution-feed";
    const feedText = document.createElement("div");
    const feedLabel = document.createElement("strong");
    feedLabel.textContent = "Canonical RSS feed";
    const feedUrl = document.createElement("input");
    feedUrl.type = "url";
    feedUrl.readOnly = true;
    feedUrl.setAttribute("aria-readonly", "true");
    feedUrl.value = String(payload.feedUrl || "");
    feedUrl.dataset.podcastDistributionFeedUrl = "";
    feedText.append(feedLabel, feedUrl);
    const copy = document.createElement("button");
    copy.className = "btn btn-outline-light";
    copy.type = "button";
    copy.dataset.podcastDistributionCopyFeed = String(payload.feedUrl || "");
    copy.textContent = "Copy feed URL";
    const copyStatus = document.createElement("p");
    copyStatus.className = "podcast-admin__status";
    copyStatus.dataset.podcastDistributionCopyStatus = "";
    copyStatus.setAttribute("role", "status");
    copyStatus.setAttribute("aria-live", "polite");
    feed.append(feedText, copy, copyStatus);
    fragment.append(feed);

    const list = document.createElement("div");
    list.className = "podcast-admin__directory-list";
    for (const destination of destinations) {
      list.append(
        distributionDestinationCard(destination, {
          episodeId: payload.episodeId || ""
        })
      );
    }
    if (!destinations.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent = "No distribution destinations are configured.";
      list.append(empty);
    }
    fragment.append(list);
    distributionRoot.replaceChildren(fragment);
  }

  function renderReleaseChannels(release, episodeId) {
    const section = document.createElement("section");
    section.className = "podcast-admin__release-channels";
    const heading = document.createElement("div");
    heading.className = "podcast-admin__panel-heading";
    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = release.publicationRevision
      ? `Release revision ${Number(release.publicationRevision)}`
      : "Release channels";
    const description = document.createElement("p");
    description.textContent =
      "Root jobs are shown separately from directory RSS ingestion.";
    titleGroup.append(title, description);
    heading.append(
      titleGroup,
      distributionBadge(releaseStatusLabel(release.status))
    );
    section.append(heading);

    const channels = Array.isArray(release.channels)
      ? release.channels
      : [];
    if (!channels.length) {
      const empty = document.createElement("p");
      empty.className = "podcast-admin__empty";
      empty.textContent =
        "This episode has not created a publication revision yet.";
      section.append(empty);
      return section;
    }
    const grid = document.createElement("div");
    grid.className = "podcast-admin__release-channel-grid";
    for (const channel of channels) {
      const card = document.createElement("article");
      const cardHeading = document.createElement("div");
      cardHeading.className = "podcast-admin__directory-heading";
      const channelTitle = document.createElement("h4");
      channelTitle.textContent = String(channel.name || channel.id || "Channel");
      cardHeading.append(
        channelTitle,
        distributionBadge(
          distributionStatusLabel(channel.status),
          channel.status === "succeeded" ? "is-ready" : ""
        )
      );
      card.append(cardHeading);

      const timing = document.createElement("p");
      timing.textContent = [
        channel.scheduledAt
          ? `Scheduled ${formatDate(channel.scheduledAt)}`
          : "",
        channel.completedAt
          ? `Completed ${formatDate(channel.completedAt)}`
          : "",
        `Attempts ${Math.max(0, Number(channel.attemptCount) || 0)}`
      ].filter(Boolean).join(" · ");
      card.append(timing);

      if (channel.providerEvidence) {
        const evidence = document.createElement("p");
        evidence.textContent =
          `Provider evidence: ${String(channel.providerEvidence)}`;
        card.append(evidence);
      }
      if (channel.id === "news" && channel.siteStatus) {
        const site = document.createElement("p");
        site.textContent = [
          `Site publication ${distributionStatusLabel(channel.siteStatus)}`,
          channel.siteCommitSha
            ? `commit ${String(channel.siteCommitSha).slice(0, 12)}`
            : ""
        ].filter(Boolean).join(" · ");
        card.append(site);
      }
      if (channel.error) {
        const error = document.createElement("p");
        error.className = "podcast-admin__status is-error";
        error.textContent = String(channel.error);
        card.append(error);
      }
      if (
        channel.retryable
        && episodeId
        && canOperateSelectedShowPublication()
      ) {
        const actions = document.createElement("div");
        actions.className = "podcast-admin__release-channel-actions";
        const retry = document.createElement("button");
        retry.className = "btn btn-outline-light";
        retry.type = "button";
        retry.dataset.podcastReleaseRetry = "";
        retry.dataset.episodeId = String(episodeId);
        retry.dataset.destination = String(channel.id || "");
        retry.dataset.publicationRevision = String(
          Number(release.publicationRevision) || 0
        );
        retry.dataset.channelName = String(
          channel.name || channel.id || "channel"
        );
        retry.textContent = `Retry ${String(
          channel.name || channel.id || "channel"
        )}`;
        const status = document.createElement("p");
        status.className = "podcast-admin__status";
        status.dataset.podcastReleaseRetryStatus = "";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        actions.append(retry, status);
        card.append(actions);
      }
      grid.append(card);
    }
    section.append(grid);
    return section;
  }

  function releaseStatusLabel(value) {
    return {
      not_published: "Not published",
      in_progress: "Release in progress",
      needs_attention: "Release needs attention",
      complete: "Root channels complete"
    }[String(value || "")] || "Unknown release state";
  }

  function distributionDestinationCard(destination, { episodeId }) {
    const card = document.createElement("article");
    card.dataset.destinationId = String(destination.id || "");

    const heading = document.createElement("div");
    heading.className = "podcast-admin__directory-heading";
    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = String(destination.name || "Directory");
    const semantics = document.createElement("p");
    semantics.textContent = destination.mode === "direct_api"
      ? "Direct provider adapter"
      : "RSS-following directory";
    titleGroup.append(title, semantics);
    const badges = document.createElement("div");
    badges.className = "podcast-admin__badges";
    badges.append(
      distributionBadge(
        destination.enabled ? "Enabled" : "Disabled",
        destination.enabled ? "is-ready" : ""
      ),
      distributionBadge(
        distributionStatusLabel(destination.ownerSetupStatus)
      )
    );
    if (destination.publicationStatus) {
      badges.append(
        distributionBadge(
          distributionStatusLabel(destination.publicationStatus),
          destination.publicationStatus === "observed" ? "is-ready" : ""
        )
      );
    }
    heading.append(titleGroup, badges);
    card.append(heading);

    const details = document.createElement("p");
    details.className = "podcast-admin__directory-details";
    details.textContent = destination.publicationRevision
      ? `Latest episode revision ${Number(
        destination.publicationRevision
      )}${destination.lastObservedAt
        ? ` · observed ${formatDate(destination.lastObservedAt)}`
        : ""}.`
      : "Directory setup state applies to this show.";
    card.append(details);

    const checklist = [
      destination.ownerAccountLabel
        ? `Owner account: ${String(destination.ownerAccountLabel)}`
        : "",
      destination.submissionDate
        ? `Submitted: ${String(destination.submissionDate)}`
        : ""
    ].filter(Boolean);
    if (checklist.length) {
      const checklistDetails = document.createElement("p");
      checklistDetails.className = "podcast-admin__directory-details";
      checklistDetails.textContent = checklist.join(" · ");
      card.append(checklistDetails);
    }
    if (destination.setupNotes) {
      const notes = document.createElement("p");
      notes.className = "podcast-admin__directory-notes";
      notes.textContent = String(destination.setupNotes);
      card.append(notes);
    }

    const links = document.createElement("div");
    links.className = "podcast-admin__directory-links";
    const setupLink = safeDistributionLink(
      destination.submissionUrl,
      "Open owner setup"
    );
    const listingLink = safeDistributionLink(
      destination.listingUrl,
      "Open public listing"
    );
    const evidenceLink = safeDistributionLink(
      destination.evidenceUrl,
      "Open episode evidence"
    );
    const submissionEvidenceLink = safeDistributionLink(
      destination.submissionEvidenceUrl,
      "Open submission evidence"
    );
    if (setupLink) links.append(setupLink);
    if (submissionEvidenceLink) links.append(submissionEvidenceLink);
    if (listingLink) links.append(listingLink);
    if (evidenceLink) links.append(evidenceLink);
    if (links.childElementCount) card.append(links);

    for (const message of [
      destination.setupError,
      destination.publicationError
    ].filter(Boolean)) {
      const error = document.createElement("p");
      error.className = "podcast-admin__status is-error";
      error.textContent = String(message);
      card.append(error);
    }

    if (canManageSelectedShowDistribution()) {
      const form = document.createElement("form");
      form.className = "podcast-admin__distribution-form";
      form.dataset.podcastDistributionForm = "";
      form.dataset.destinationId = String(destination.id || "");
      form.dataset.episodeId = episodeId;

      const statusLabel = document.createElement("label");
      statusLabel.textContent = "Owner setup";
      const status = document.createElement("select");
      status.name = "ownerSetupStatus";
      for (const [value, label] of [
        ["not_started", "Not started"],
        ["pending", "In progress"],
        ["verified", "Setup complete"],
        ["not_required", "Not required"]
      ]) {
        status.append(
          new Option(
            label,
            value,
            false,
            value === destination.ownerSetupStatus
          )
        );
      }
      statusLabel.append(status);

      const accountLabel = document.createElement("label");
      accountLabel.textContent = "Responsible account label (optional)";
      const account = document.createElement("input");
      account.name = "ownerAccountLabel";
      account.type = "text";
      account.maxLength = 120;
      account.autocomplete = "off";
      account.placeholder = "Dust Wave operations";
      account.value = String(destination.ownerAccountLabel || "");
      accountLabel.append(account);

      const submissionDateLabel = document.createElement("label");
      submissionDateLabel.textContent = "Submission date (optional)";
      const submissionDate = document.createElement("input");
      submissionDate.name = "submissionDate";
      submissionDate.type = "date";
      submissionDate.value = String(destination.submissionDate || "");
      submissionDateLabel.append(submissionDate);

      const submissionEvidenceLabel = document.createElement("label");
      submissionEvidenceLabel.textContent =
        "Submission receipt or dashboard URL (optional)";
      const submissionEvidence = document.createElement("input");
      submissionEvidence.name = "submissionEvidenceUrl";
      submissionEvidence.type = "url";
      submissionEvidence.inputMode = "url";
      submissionEvidence.maxLength = 2048;
      submissionEvidence.placeholder = "https://";
      submissionEvidence.value = String(
        destination.submissionEvidenceUrl || ""
      );
      submissionEvidenceLabel.append(submissionEvidence);

      const listingLabel = document.createElement("label");
      listingLabel.textContent = "Public listing URL (optional)";
      const listing = document.createElement("input");
      listing.name = "listingUrl";
      listing.type = "url";
      listing.inputMode = "url";
      listing.maxLength = 2048;
      listing.placeholder = "https://";
      listing.value = String(destination.listingUrl || "");
      listingLabel.append(listing);

      const notesLabel = document.createElement("label");
      notesLabel.className = "podcast-admin__distribution-form-wide";
      notesLabel.textContent =
        "Operational notes (never passwords or verification codes)";
      const notes = document.createElement("textarea");
      notes.name = "setupNotes";
      notes.rows = 3;
      notes.maxLength = 1000;
      notes.value = String(destination.setupNotes || "");
      notesLabel.append(notes);

      const enabledLabel = document.createElement("label");
      enabledLabel.className = "podcast-admin__checkbox";
      const enabled = document.createElement("input");
      enabled.name = "enabled";
      enabled.type = "checkbox";
      enabled.checked = Boolean(destination.enabled);
      enabledLabel.append(enabled, document.createTextNode(" Enabled"));

      const save = document.createElement("button");
      save.className = "btn btn-outline-light";
      save.type = "submit";
      save.textContent = "Save setup";
      const formStatus = document.createElement("p");
      formStatus.className = "podcast-admin__status";
      formStatus.dataset.podcastDistributionStatus = "";
      formStatus.setAttribute("role", "status");
      formStatus.setAttribute("aria-live", "polite");
      form.append(
        statusLabel,
        accountLabel,
        submissionDateLabel,
        submissionEvidenceLabel,
        listingLabel,
        notesLabel,
        enabledLabel,
        save,
        formStatus
      );
      card.append(form);
    }
    if (
      episodeId
      && Number(destination.publicationRevision) > 0
      && destination.publicationStatus
      && !["setup_required", "disabled"].includes(
        destination.publicationStatus
      )
      && canOperateSelectedShowPublication()
    ) {
      card.append(directoryObservationForm(destination, { episodeId }));
    }
    return card;
  }

  function directoryObservationForm(destination, { episodeId }) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__distribution-form podcast-admin__directory-observation-form";
    form.dataset.podcastDirectoryObservationForm = "";
    form.dataset.destinationId = String(destination.id || "");
    form.dataset.episodeId = String(episodeId);
    form.dataset.publicationRevision = String(
      Number(destination.publicationRevision) || 0
    );

    const stateLabel = document.createElement("label");
    stateLabel.textContent = "Episode directory state";
    const state = document.createElement("select");
    state.name = "status";
    state.append(
      new Option(
        "Observed in directory",
        "observed",
        false,
        destination.publicationStatus !== "failed"
      ),
      new Option(
        "Needs attention",
        "failed",
        false,
        destination.publicationStatus === "failed"
      )
    );
    stateLabel.append(state);

    const evidenceLabel = document.createElement("label");
    evidenceLabel.textContent = "HTTPS episode evidence";
    const evidence = document.createElement("input");
    evidence.name = "evidenceUrl";
    evidence.type = "url";
    evidence.inputMode = "url";
    evidence.maxLength = 2048;
    evidence.placeholder = "https://";
    evidence.value = String(destination.evidenceUrl || "");
    evidenceLabel.append(evidence);

    const errorLabel = document.createElement("label");
    errorLabel.dataset.podcastDirectoryObservationError = "";
    errorLabel.textContent = "Failure detail";
    const error = document.createElement("textarea");
    error.name = "error";
    error.rows = 2;
    error.maxLength = 500;
    error.value = String(destination.publicationError || "");
    errorLabel.append(error);

    const save = document.createElement("button");
    save.className = "btn btn-outline-light";
    save.type = "submit";
    save.textContent = "Save episode evidence";
    const formStatus = document.createElement("p");
    formStatus.className = "podcast-admin__status";
    formStatus.dataset.podcastDirectoryObservationStatus = "";
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.append(
      stateLabel,
      evidenceLabel,
      errorLabel,
      save,
      formStatus
    );
    state.addEventListener(
      "change",
      () => updateDirectoryObservationFields(form)
    );
    updateDirectoryObservationFields(form);
    return form;
  }

  function updateDirectoryObservationFields(form) {
    const failed = form.elements.status.value === "failed";
    const errorLabel = form.querySelector(
      "[data-podcast-directory-observation-error]"
    );
    errorLabel.hidden = !failed;
    form.elements.error.required = failed;
    form.elements.evidenceUrl.required = !failed;
  }

  function distributionBadge(label, className = "") {
    const badge = document.createElement("span");
    badge.className = `podcast-admin__pill ${className}`.trim();
    badge.textContent = label;
    return badge;
  }

  function distributionStatusLabel(value) {
    return {
      not_started: "Setup not started",
      pending: "Setup in progress",
      verified: "Owner setup complete",
      not_required: "Setup not required",
      setup_required: "Setup required",
      waiting_for_feed: "Waiting for RSS ingestion",
      queued: "Queued",
      running: "Running",
      processing: "Processing",
      succeeded: "Succeeded",
      observed: "Observed in directory",
      failed: "Needs attention",
      canceled: "Canceled",
      disabled: "Disabled"
    }[String(value || "")] || "Unknown";
  }

  function safeDistributionLink(value, label) {
    try {
      const url = new URL(String(value || ""));
      if (
        url.protocol !== "https:"
        || url.username
        || url.password
        || url.hash
      ) return null;
      const link = document.createElement("a");
      link.className = "btn btn-outline-light";
      link.href = url.toString();
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      return link;
    } catch {
      return null;
    }
  }

  function canManageSelectedShowDistribution() {
    return (adminIdentity?.roles || []).some(({ role, showId }) =>
      (role === "super_admin" || role === "admin")
      && (role === "super_admin" || !showId || showId === selectedShowId)
    );
  }

  function canOperateSelectedShowPublication() {
    return (adminIdentity?.roles || []).some(({ role, showId }) =>
      ["super_admin", "admin", "producer"].includes(role)
      && (role === "super_admin" || !showId || showId === selectedShowId)
    );
  }

  async function handleDistributionClick(event) {
    const retry = event.target.closest("[data-podcast-release-retry]");
    if (retry) {
      await retryReleaseChannel(retry);
      return;
    }
    const button = event.target.closest(
      "[data-podcast-distribution-copy-feed]"
    );
    if (!button) return;
    const status = distributionRoot.querySelector(
      "[data-podcast-distribution-copy-status]"
    );
    const value = button.dataset.podcastDistributionCopyFeed || "";
    try {
      await navigator.clipboard.writeText(value);
      setStatus(status, "Feed URL copied.");
    } catch (_error) {
      const input = distributionRoot.querySelector(
        "[data-podcast-distribution-feed-url]"
      );
      input?.focus();
      input?.select();
      setStatus(
        status,
        "Copy is unavailable. The feed URL is selected for manual copying.",
        true
      );
    }
  }

  async function retryReleaseChannel(button) {
    if (!canOperateSelectedShowPublication()) return;
    const episodeId = String(button.dataset.episodeId || "");
    const destination = String(button.dataset.destination || "");
    const publicationRevision = Number(
      button.dataset.publicationRevision || 0
    );
    const channelName = String(button.dataset.channelName || "channel");
    if (
      !episodeId
      || !/^[A-Za-z0-9_-]+$/.test(destination)
      || !Number.isSafeInteger(publicationRevision)
      || publicationRevision <= 0
    ) return;
    if (
      !window.confirm(
        `Retry ${channelName} for release revision ${publicationRevision}?`
      )
    ) return;
    const status = button.parentElement?.querySelector(
      "[data-podcast-release-retry-status]"
    );
    button.disabled = true;
    setStatus(status, `Queueing ${channelName} retry…`);
    try {
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/distribution/${encodeURIComponent(destination)}/retry`,
        {
          method: "POST",
          body: { publicationRevision }
        }
      );
      setStatus(
        status,
        result.idempotent
          ? `${channelName} is already queued or running.`
          : `${channelName} retry queued${
            result.delivery === "scheduled"
              ? " for the next scheduler pass"
              : ""
          }.`
      );
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function updateDistributionDestination(event) {
    const form = event.target.closest("[data-podcast-distribution-form]");
    if (!form) return;
    event.preventDefault();
    if (!canManageSelectedShowDistribution()) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-podcast-distribution-status]");
    button.disabled = true;
    setStatus(status, "Saving owner setup…");
    try {
      await client.request(
        `/v1/admin/shows/${encodeURIComponent(
          selectedShowId
        )}/distribution/${encodeURIComponent(form.dataset.destinationId)}`,
        {
          method: "PATCH",
          body: {
            enabled: form.elements.enabled.checked,
            ownerSetupStatus: form.elements.ownerSetupStatus.value,
            listingUrl: form.elements.listingUrl.value,
            ownerAccountLabel: form.elements.ownerAccountLabel.value,
            submissionDate: form.elements.submissionDate.value,
            submissionEvidenceUrl:
              form.elements.submissionEvidenceUrl.value,
            setupNotes: form.elements.setupNotes.value
          }
        }
      );
      setStatus(status, "Directory setup saved.");
      await loadDistribution(form.dataset.episodeId || undefined);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function updateDirectoryObservation(event) {
    const form = event.target.closest(
      "[data-podcast-directory-observation-form]"
    );
    if (!form) return;
    event.preventDefault();
    if (!canOperateSelectedShowPublication()) return;
    const episodeId = String(form.dataset.episodeId || "");
    const destinationId = String(form.dataset.destinationId || "");
    const publicationRevision = Number(
      form.dataset.publicationRevision || 0
    );
    if (
      !episodeId
      || !/^[A-Za-z0-9_-]+$/.test(destinationId)
      || !Number.isSafeInteger(publicationRevision)
      || publicationRevision <= 0
    ) return;
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(
      "[data-podcast-directory-observation-status]"
    );
    button.disabled = true;
    setStatus(status, "Saving episode evidence…");
    try {
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/distribution/${encodeURIComponent(destinationId)}`,
        {
          method: "PATCH",
          body: {
            publicationRevision,
            status: form.elements.status.value,
            evidenceUrl: form.elements.evidenceUrl.value,
            error: form.elements.error.value
          }
        }
      );
      setStatus(
        status,
        result.idempotent
          ? "Directory evidence is already current."
          : "Directory evidence saved."
      );
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function initializeCampaignForm() {
    if (!campaignForm) return;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    campaignForm.elements.startsAt.value = datetimeLocalValue(now);
    campaignForm.elements.endsAt.value = datetimeLocalValue(end);
    updateDirectSponsorFields();
  }

  function updateDirectSponsorFields() {
    if (!campaignForm) return;
    const direct = campaignForm.elements.campaignType.value === "direct";
    for (const field of campaignForm.querySelectorAll("[data-direct-sponsor-field]")) {
      field.hidden = !direct;
      for (const control of field.querySelectorAll("input, select")) {
        control.disabled = !direct;
      }
    }
    campaignForm.elements.sponsorName.required = direct;
  }

  async function loadCampaigns() {
    if (!selectedShowId) {
      campaigns = [];
      campaignList?.replaceChildren();
      fillCreativeCampaignSelect();
      return;
    }
    campaignList.innerHTML = "<p>Loading sponsor campaigns…</p>";
    try {
      const payload = await client.request(
        `/v1/admin/ads/campaigns?showId=${encodeURIComponent(selectedShowId)}`
      );
      campaigns = payload.campaigns || [];
      renderCampaigns(campaigns);
      fillCreativeCampaignSelect();
    } catch (error) {
      campaigns = [];
      campaignList.textContent = friendlyError(error);
      fillCreativeCampaignSelect();
    }
  }

  function fillCreativeCampaignSelect() {
    const select = creativeForm?.elements.campaignId;
    if (!select) return;
    const previousValue = select.value;
    const activeCampaigns = campaigns.filter(({ active }) => active);
    select.replaceChildren(...activeCampaigns.map((campaign) =>
      new Option(
        `${campaign.name} — ${humanizeCode(campaign.approvalStatus)}`,
        campaign.id,
        false,
        campaign.id === previousValue
      )
    ));
    const button = creativeForm.querySelector('button[type="submit"]');
    button.disabled = activeCampaigns.length === 0;
    if (activeCampaigns.length === 0) {
      setStatus(
        creativeStatus,
        "Create an active campaign before uploading creative audio."
      );
    } else if (creativeProgress.hidden) {
      setStatus(creativeStatus, "");
    }
  }

  function renderCampaigns(campaignRows) {
    if (!campaignRows.length) {
      campaignList.innerHTML =
        '<p class="podcast-admin__empty">No sponsor or house-promo campaigns yet.</p>';
      return;
    }
    campaignList.replaceChildren(...campaignRows.map((campaign) => {
      const row = document.createElement("article");
      row.className = "podcast-admin__campaign";
      const blockers = campaign.blockers || [];
      const blockerItems = blockers.length
        ? blockers.map((blocker) =>
            `<li>${escapeHtml(humanizeCode(blocker))}</li>`
          ).join("")
        : "<li>Campaign metadata is ready.</li>";
      const canApprove = canManageCampaigns
        && campaign.active
        && campaign.approvalStatus !== "approved";
      const canKill = canManageCampaigns && campaign.active;
      row.innerHTML = `
        <div>
          <p class="podcast-admin__pill">${escapeHtml(campaign.approvalStatus)} · ${campaign.active ? "active draft row" : "revoked"}</p>
          <h3>${escapeHtml(campaign.name)}</h3>
          <p>${escapeHtml(campaign.campaignType)}${campaign.sponsor?.name ? ` · ${escapeHtml(campaign.sponsor.name)}` : ""}</p>
          <p>${escapeHtml(formatDate(campaign.startsAt))} → ${escapeHtml(formatDate(campaign.endsAt))}</p>
          <p>Qualified: ${Number(campaign.qualifiedImpressions || 0)}${campaign.qualifiedImpressionGoal ? ` / ${Number(campaign.qualifiedImpressionGoal)}` : ""} · Ready creatives: ${Number(campaign.readyCreativeCount || 0)}</p>
          <ul>${blockerItems}</ul>
        </div>
        <div class="podcast-admin__episode-actions">
          <button class="btn btn-outline-light" type="button" data-approve-campaign="${escapeAttribute(campaign.id)}" ${canApprove ? "" : "disabled"}>Approve</button>
          <button class="btn btn-danger" type="button" data-kill-campaign="${escapeAttribute(campaign.id)}" ${canKill ? "" : "disabled"}>Kill</button>
        </div>`;
      return row;
    }));
  }

  async function createCampaign(event) {
    event.preventDefault();
    const button = campaignForm.querySelector('button[type="submit"]');
    const direct = campaignForm.elements.campaignType.value === "direct";
    button.disabled = true;
    setStatus(campaignStatus, "Creating audited campaign draft…");
    try {
      await client.request("/v1/admin/ads/campaigns", {
        method: "POST",
        body: {
          showId: selectedShowId,
          name: campaignForm.elements.name.value,
          campaignType: campaignForm.elements.campaignType.value,
          sponsorName: direct ? campaignForm.elements.sponsorName.value : null,
          sponsorWebsiteUrl: direct
            ? campaignForm.elements.sponsorWebsiteUrl.value || null
            : null,
          startsAt: isoOrNull(campaignForm.elements.startsAt.value),
          endsAt: isoOrNull(campaignForm.elements.endsAt.value),
          episodeId: campaignForm.elements.episodeId.value || null,
          position: campaignForm.elements.position.value || null,
          appName: campaignForm.elements.appName.value || null,
          deviceType: campaignForm.elements.deviceType.value || null,
          priority: Number(campaignForm.elements.priority.value || 0),
          pacingStrategy: campaignForm.elements.pacingStrategy.value,
          impressionCap: integerOrNull(campaignForm.elements.impressionCap.value),
          qualifiedImpressionGoal: integerOrNull(
            campaignForm.elements.qualifiedImpressionGoal.value
          ),
          billingModel: direct
            ? campaignForm.elements.billingModel.value
            : "flat_fee",
          contractAmountCents: direct
            ? moneyToCents(campaignForm.elements.contractAmount.value)
            : null,
          cpmCents: direct ? moneyToCents(campaignForm.elements.cpm.value) : null
        }
      });
      campaignForm.reset();
      initializeCampaignForm();
      fillEpisodeSelects();
      setStatus(
        campaignStatus,
        "Draft created. Validate compatible creative audio before approval."
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(campaignStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function uploadCreative(event) {
    event.preventDefault();
    const file = creativeForm.elements.audio.files[0];
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)) {
      setStatus(creativeStatus, "Choose an MP3 file.", true);
      return;
    }
    if (file.size < 1 || file.size > 25 * 1024 * 1024) {
      setStatus(
        creativeStatus,
        "Creative audio must be between 1 byte and 25 MiB.",
        true
      );
      return;
    }
    const button = creativeForm.querySelector('button[type="submit"]');
    const campaignId = creativeForm.elements.campaignId.value;
    button.disabled = true;
    creativeProgress.hidden = false;
    creativeProgress.value = 0;
    setStatus(creativeStatus, "Creating audited creative metadata…");
    try {
      const created = await client.request(
        `/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}/creatives`,
        {
          method: "POST",
          body: {
            name: creativeForm.elements.name.value,
            filename: file.name,
            durationSeconds: Number(
              creativeForm.elements.durationSeconds.value
            ),
            weight: Number(creativeForm.elements.weight.value),
            streamProfile: "mp3-44100-stereo-cbr128-frame-v1"
          }
        }
      );
      creativeProgress.value = 1;
      if (
        created.upload?.lengthHeader !== "x-podcast-upload-bytes"
        || created.upload?.maximumBytes < file.size
      ) {
        throw new Error("The creative upload contract was not accepted.");
      }
      setStatus(creativeStatus, "Streaming creative audio to private storage…");
      await client.request(created.upload.path, {
        method: created.upload.method,
        body: file,
        headers: {
          "content-type": created.upload.contentType,
          [created.upload.lengthHeader]: String(file.size)
        }
      });
      creativeProgress.value = 2;
      setStatus(creativeStatus, "Validating MP3 frames, duration, and digest…");
      const validated = await client.request(
        `/v1/admin/ads/creatives/${encodeURIComponent(created.creativeId)}/validate`,
        { method: "POST", body: {} }
      );
      if (validated.validationStatus !== "ready") {
        throw new Error(
          "The creative did not return a ready validation state."
        );
      }
      creativeProgress.value = 3;
      creativeForm.reset();
      setStatus(
        creativeStatus,
        `Creative validated: ${Number(validated.report?.durationMs || 0)} ms, ${Number(validated.report?.frameCount || 0)} frames. Review and approve the campaign.`
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(creativeStatus, friendlyError(error), true);
    } finally {
      button.disabled = campaigns.filter(({ active }) => active).length === 0;
    }
  }

  async function handleCampaignAction(event) {
    const approveButton = event.target.closest("[data-approve-campaign]");
    const killButton = event.target.closest("[data-kill-campaign]");
    const button = approveButton || killButton;
    if (!button) return;
    const campaignId = approveButton
      ? approveButton.dataset.approveCampaign
      : killButton.dataset.killCampaign;
    if (
      killButton
      && !globalThis.confirm(
        "Kill this campaign immediately? This campaign row cannot be reactivated."
      )
    ) {
      return;
    }
    button.disabled = true;
    setStatus(
      campaignStatus,
      approveButton ? "Checking approval gates…" : "Killing campaign…"
    );
    try {
      await client.request(
        `/v1/admin/ads/campaigns/${encodeURIComponent(campaignId)}/${approveButton ? "approve" : "kill"}`,
        { method: "POST", body: {} }
      );
      setStatus(
        campaignStatus,
        approveButton ? "Campaign approved." : "Campaign killed."
      );
      await loadCampaigns();
    } catch (error) {
      setStatus(campaignStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function previewSponsorDecision(event) {
    event.preventDefault();
    const button = sponsorForm.querySelector('button[type="submit"]');
    button.disabled = true;
    sponsorResult.replaceChildren();
    setStatus(sponsorStatus, "Evaluating current sponsor inventory…");
    try {
      const payload = await client.request("/v1/admin/ads/preview", {
        method: "POST",
        body: {
          episodeId: sponsorForm.elements.episodeId.value,
          position: sponsorForm.elements.position.value,
          appName: sponsorForm.elements.appName.value,
          deviceType: sponsorForm.elements.deviceType.value,
          streamProfile: sponsorForm.elements.streamProfile.value,
          at: isoOrNull(sponsorForm.elements.at.value)
        }
      });
      if (!payload.previewOnly || payload.persisted) {
        throw new Error("The sponsor preview safety contract was not returned.");
      }
      renderSponsorDecision(payload);
      setStatus(sponsorStatus, "Preview complete. No delivery or counters changed.");
    } catch (error) {
      setStatus(sponsorStatus, friendlyError(error), true);
    } finally {
      button.disabled = episodes.length === 0;
    }
  }

  function renderSponsorDecision(payload) {
    const blockers = payload.readiness?.blockers || [];
    const selection = payload.decision?.selection;
    const decision = selection
      ? `
        <p class="podcast-admin__pill">Proposed selection</p>
        <h3>${escapeHtml(selection.campaignType)} campaign</h3>
        <dl>
          <div><dt>Campaign</dt><dd>${escapeHtml(selection.campaignId)}</dd></div>
          <div><dt>Creative</dt><dd>${escapeHtml(selection.creativeId)}</dd></div>
          <div><dt>Rule</dt><dd>${escapeHtml(selection.ruleId || "generic")}</dd></div>
          <div><dt>Priority</dt><dd>${Number(selection.reason?.priority || 0)}</dd></div>
        </dl>`
      : `
        <p class="podcast-admin__pill">Full-file fallback</p>
        <h3>No eligible inventory</h3>
        <p>The existing episode file remains the delivery choice.</p>`;
    const blockerItems = blockers.length
      ? blockers.map((blocker) => `<li>${escapeHtml(humanizeCode(blocker))}</li>`).join("")
      : "<li>No readiness blockers reported.</li>";
    const card = document.createElement("article");
    card.className = "podcast-admin__decision";
    card.innerHTML = `
      <div>
        ${decision}
      </div>
      <div>
        <h3>Activation blockers</h3>
        <ul>${blockerItems}</ul>
        <p><strong>Public delivery:</strong> ${escapeHtml(payload.publicDeliveryMode)}</p>
        <p><strong>Campaigns evaluated:</strong> ${Number(payload.inventory?.campaignCount || 0)}</p>
        <p><strong>Inventory revision:</strong> <code>${escapeHtml(String(payload.inventory?.fingerprint || "").slice(0, 12))}</code></p>
      </div>`;
    sponsorResult.replaceChildren(card);
  }

  async function loadBilling() {
    billingRoot.innerHTML = "<p>Loading premium readiness…</p>";
    try {
      const payload = await client.request("/v1/admin/billing/readiness");
      billingRoot.innerHTML = `
        <div class="podcast-admin__callout">
          <p><strong>Mode:</strong> ${escapeHtml(payload.mode)}</p>
          <p><strong>Checkout:</strong> ${payload.checkoutEnabled ? "enabled" : "disabled"}</p>
          <p><strong>Approved tax:</strong> ${payload.taxCollectionEnabled ? "configured" : "not approved"}</p>
          <p><strong>Stripe API:</strong> ${payload.configured?.apiKey ? "configured" : "missing"} · <strong>Webhook:</strong> ${payload.configured?.webhookSecret ? "configured" : "missing"}</p>
          <p><strong>Failed webhook events:</strong> ${Number(payload.failedWebhookEvents || 0)}</p>
        </div>`;
    } catch (error) {
      billingRoot.textContent = friendlyError(error);
    }
  }

  async function loadAdReconciliation({ reset = false } = {}) {
    if (
      (!reset && reconciliationLoading)
      || !selectedShowId
      || !reconciliationRoot
    ) return;
    const requestedShowId = selectedShowId;
    if (reset) {
      reconciliationRows = [];
      reconciliationCursor = null;
      reconciliationRoot.replaceChildren();
    } else if (!reconciliationCursor) {
      return;
    }
    const requestId = ++reconciliationRequestId;
    reconciliationLoading = true;
    setStatus(
      reconciliationStatus,
      reset
        ? "Loading trusted sponsor-delivery evidence…"
        : "Loading more campaign evidence…"
    );
    const cursor = reset ? null : reconciliationCursor;
    const query = new URLSearchParams({
      showId: requestedShowId,
      limit: "50"
    });
    if (cursor) query.set("cursor", cursor);
    try {
      const payload = await client.request(
        `/v1/admin/ads/reconciliation?${query.toString()}`
      );
      if (
        selectedShowId !== requestedShowId
        || requestId !== reconciliationRequestId
      ) return;
      reconciliationRows = reset
        ? payload.campaigns || []
        : reconciliationRows.concat(payload.campaigns || []);
      reconciliationCursor = payload.pagination?.nextCursor || null;
      renderAdReconciliation(payload);
      setStatus(
        reconciliationStatus,
        payload.summary?.discrepancyCount
          ? "Counter differences require review before sponsor reporting."
          : "Durable qualification rows and campaign counters reconcile."
      );
    } catch (error) {
      if (
        selectedShowId !== requestedShowId
        || requestId !== reconciliationRequestId
      ) return;
      setStatus(reconciliationStatus, friendlyError(error), true);
      if (reset) {
        reconciliationRoot.replaceChildren();
        setReconciliationMetrics();
      }
    } finally {
      if (requestId === reconciliationRequestId) {
        reconciliationLoading = false;
      }
    }
  }

  function renderAdReconciliation(payload) {
    const summary = payload.summary || {};
    const show = shows.find(({ id }) => id === selectedShowId);
    if (reconciliationShow) {
      reconciliationShow.textContent = show?.title || "this show";
    }
    setReconciliationMetrics(summary);
    if (!reconciliationRows.length) {
      reconciliationRoot.innerHTML =
        '<p class="podcast-admin__empty">No sponsor or house-promo campaigns to reconcile yet.</p>';
      return;
    }
    const tableRows = reconciliationRows.map((campaign) => {
      const progressTarget =
        campaign.qualifiedImpressionGoal || campaign.impressionCap;
      const progress = progressTarget
        ? `${formatInteger(campaign.qualifiedImpressions)} / ${formatInteger(progressTarget)}`
        : formatInteger(campaign.qualifiedImpressions);
      return `
        <tr>
          <th scope="row">
            <strong>${escapeHtml(campaign.name)}</strong>
            <span>${escapeHtml(campaign.sponsorName || humanizeCode(campaign.campaignType))}</span>
          </th>
          <td>${escapeHtml(humanizeCode(campaign.approvalStatus))}</td>
          <td>${progress}</td>
          <td>${formatInteger(campaign.qualificationRows)}</td>
          <td class="${campaign.reconciled ? "" : "is-error"}">${formatInteger(campaign.difference)}</td>
          <td>${escapeHtml(formatDate(campaign.lastQualifiedAt))}</td>
        </tr>`;
    }).join("");
    reconciliationRoot.innerHTML = `
      <div
        class="podcast-admin__table-scroll"
        role="region"
        aria-label="Sponsor delivery reconciliation"
        tabindex="0">
        <table class="podcast-admin__table">
          <caption>Trusted download v1 · campaign counters compared with durable qualification rows</caption>
          <thead>
            <tr>
              <th scope="col">Campaign</th>
              <th scope="col">Status</th>
              <th scope="col">Progress</th>
              <th scope="col">Durable rows</th>
              <th scope="col">Difference</th>
              <th scope="col">Last qualified</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      ${reconciliationCursor
        ? '<button class="btn btn-outline-light podcast-admin__more" type="button" data-podcast-reconciliation-more>Load more campaigns</button>'
        : ""}`;
  }

  function setReconciliationMetrics(summary = {}) {
    if (qualifiedSponsorDeliveries) {
      qualifiedSponsorDeliveries.textContent = summary.counterValue === undefined
        ? "—"
        : formatInteger(summary.counterValue);
    }
    if (reconciliationDifferences) {
      reconciliationDifferences.textContent =
        summary.discrepancyCount === undefined
          ? "—"
          : formatInteger(summary.discrepancyCount);
    }
    if (campaignsAtCap) {
      campaignsAtCap.textContent = summary.campaignsAtCap === undefined
        ? "—"
        : formatInteger(summary.campaignsAtCap);
    }
  }

  function initializeTurnstile() {
    const siteKey = root.dataset.turnstileSiteKey;
    if (!siteKey) return;
    const render = () => {
      if (!globalThis.turnstile) {
        setTimeout(render, 100);
        return;
      }
      turnstileWidgetId = globalThis.turnstile.render("#podcast-turnstile", {
        sitekey: siteKey,
        action: "podcast_admin_login",
        callback: (token) => { turnstileToken = token; },
        "expired-callback": () => { turnstileToken = ""; }
      });
    };
    render();
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (turnstileWidgetId !== undefined) {
      globalThis.turnstile?.reset?.(turnstileWidgetId);
    }
  }
}

function setStatus(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", error);
}

function emptyTranscript(language) {
  return {
    id: null,
    language,
    source: "editor",
    status: "new",
    revision: 0,
    speakerLabelsConfirmed: true,
    approvedRevision: null,
    approvedAt: null,
    cues: [newTranscriptCue()],
    alignment: {
      id: null,
      status: "not_run",
      adapter: null,
      model: null,
      completedAt: null,
      alignedWordCount: 0,
      wordControlsEnabled: false
    }
  };
}

function newTranscriptCue(startsAtMs = 0, endsAtMs = 5_000) {
  return {
    id: operationId("cue"),
    startsAtMs,
    endsAtMs,
    speakerLabel: "",
    speakerConfirmed: false,
    textMarkdown: ""
  };
}

function emptyChapterSet(episodeId) {
  return {
    episodeId,
    durationSeconds: null,
    status: "needs_review",
    revision: 0,
    contentSha256: null,
    approvedRevision: null,
    approvedAt: null,
    chapters: [newChapter(0)]
  };
}

function newChapter(startsAtMs = 0) {
  return {
    id: operationId("chapter"),
    startsAtMs,
    title: "",
    url: "",
    imageUrl: "",
    toc: true
  };
}

function operationId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function millisecondsToSeconds(value) {
  return (Number(value || 0) / 1_000).toFixed(3).replace(/\.?0+$/, "");
}

function millisecondsToTimestamp(value) {
  const totalMilliseconds = Math.max(0, Math.round(Number(value || 0)));
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000);
  const milliseconds = totalMilliseconds % 1_000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function formatClipDuration(value) {
  const seconds = Number(value || 0) / 1_000;
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: seconds < 10 ? 1 : 0
  }).format(seconds)} seconds`;
}

function clipCueSummary(value) {
  const summary = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[*_~`[\]()>#+=-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return summary.length > 72 ? `${summary.slice(0, 69)}…` : summary;
}

function secondsToMilliseconds(value, label) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  const milliseconds = Math.round(seconds * 1_000);
  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error(`${label} is outside the supported range.`);
  }
  return milliseconds;
}

function transcriptInputError(error) {
  return error instanceof Error
    ? error.message
    : "The transcript cue values are invalid.";
}

function chapterInputError(error) {
  return error instanceof Error
    ? error.message
    : "The chapter values are invalid.";
}

function reviewInputError(error) {
  return error instanceof Error
    ? error.message
    : "The production review values are invalid.";
}

function optionalReviewMilliseconds(value, label) {
  const text = String(value || "").trim();
  if (!text) return null;
  return secondsToMilliseconds(text, label);
}

function formatReviewRange(startsAtMs, endsAtMs) {
  if (startsAtMs === null || startsAtMs === undefined) return "Untimed";
  const start = millisecondsToTimestamp(Number(startsAtMs));
  return endsAtMs === null || endsAtMs === undefined
    ? start
    : `${start}–${millisecondsToTimestamp(Number(endsAtMs))}`;
}

function checkedHttpsUrl(value, label) {
  const text = String(value || "").trim();
  if (!text) return "";
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} must be a complete HTTPS URL.`);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${label} must be a complete HTTPS URL.`);
  }
  return url.href;
}

function friendlyError(error) {
  if (!(error instanceof AdminApiError)) {
    return "The Podcast service could not be reached. Please retry.";
  }
  if (error.code === "admin_auth_not_configured") return "Staging login providers are not configured yet.";
  if (error.code === "invalid_csrf_token") return "Your secure session changed. Refresh and retry.";
  if (error.code === "audio_qc_source_not_ready") {
    return "Complete a private source-audio upload before queueing QC.";
  }
  if (error.code === "audio_qc_source_mismatch") {
    return "The private source object changed or disappeared. Upload or select the source again.";
  }
  if (error.code === "audio_qc_run_exists") {
    return "This exact source and policy already have an active or completed QC run.";
  }
  if (
    error.code === "audio_qc_run_conflict"
    || error.code === "audio_qc_completion_conflict"
  ) {
    return "The QC run changed in another session. Refresh its report.";
  }
  if (error.code === "episode_not_ready") return `Episode is not ready: ${(error.details?.missing || []).join(", ")}.`;
  if (error.code === "publication_snapshot_required") {
    return "Refresh publication readiness before publishing this episode.";
  }
  if (
    error.code === "publication_snapshot_stale"
    || error.code === "publication_conflict"
  ) {
    return "Publication evidence changed before the release committed. Reload and retry.";
  }
  if (error.code === "publication_snapshot_busy") {
    return "Publication evidence is still changing. Wait for current edits to finish, then retry.";
  }
  if (error.code === "publication_not_ready") {
    return error.message
      || "Resolve the publication blockers or ask an Admin to review an override.";
  }
  if (error.code === "publication_override_forbidden") {
    return "Only an Admin or Super-admin can override publication blockers.";
  }
  if (error.code === "recent_authentication_required") {
    return "Request a fresh admin magic link before overriding publication blockers.";
  }
  if (error.code.startsWith("publication_override_")) {
    return error.message || "The publication override is invalid.";
  }
  if (error.code === "campaign_not_ready") {
    return `Campaign is not ready: ${(error.details?.blockers || []).map(humanizeCode).join(", ")}.`;
  }
  if (error.code === "campaign_revoked") {
    return "That campaign was killed and cannot be reactivated. Create a new campaign.";
  }
  if (error.code === "episode_delivery_audio_not_ready") {
    return "Attach ready delivery audio before defining ad markers.";
  }
  if (error.code === "episode_delivery_audio_must_be_mp3") {
    return "Dynamic-ad segmentation currently requires MP3 delivery audio.";
  }
  if (error.code === "episode_duration_required") {
    return "Set the reviewed episode duration before defining ad markers.";
  }
  if (error.code === "ad_plan_not_ready") {
    return "Processor evidence must be ready before this plan can be approved.";
  }
  if (error.code === "ad_plan_source_changed") {
    return "The delivery audio changed. Submit and process a new ad plan.";
  }
  if (error.code === "transcript_revision_conflict") {
    return "This transcript changed in another session. Reload it before saving.";
  }
  if (error.code === "transcript_mutation_conflict") {
    return "That transcript save identifier was already used for different content.";
  }
  if (error.code === "transcript_speaker_labels_unconfirmed") {
    return "Confirm every non-empty public speaker label before approval.";
  }
  if (error.code === "transcript_approval_conflict") {
    return "This transcript approval changed in another session. Reload and review it.";
  }
  if (error.code === "chapter_revision_conflict") {
    return "These chapters changed in another session. Reload them before saving.";
  }
  if (error.code === "chapter_mutation_conflict") {
    return "That chapter save identifier was already used for different content.";
  }
  if (error.code === "chapter_approval_conflict") {
    return "This chapter approval changed in another session. Reload and review it.";
  }
  if (
    error.code === "review_revision_conflict"
    || error.code === "review_comment_revision_conflict"
  ) {
    return "This production review changed in another session. Reload it before saving.";
  }
  if (
    error.code === "review_mutation_conflict"
    || error.code === "review_comment_id_conflict"
  ) {
    return "That production review operation identifier was already used for different content.";
  }
  if (error.code === "review_target_not_current") {
    return "That target revision is no longer current. Reload production review.";
  }
  if (error.code === "review_approval_forbidden") {
    return "Admin approval is required to approve or reopen an approved review.";
  }
  if (error.code === "review_open_blockers") {
    return "Resolve every open blocker on this target before approving it.";
  }
  if (error.code === "clip_approved_transcript_required") {
    return "Approve this transcript language before creating a clip.";
  }
  if (error.code === "clip_revision_conflict") {
    return "This clip changed in another session. Reload it before saving.";
  }
  if (error.code === "clip_mutation_conflict") {
    return "That clip save identifier was already used for different content.";
  }
  if (error.code === "clip_render_exists") {
    return "A private render already exists for this clip revision. Reload the clip list.";
  }
  if (error.code === "clip_transcript_changed") {
    return "The approved transcript changed. Save a new clip recipe revision.";
  }
  if (error.code === "clip_source_changed") {
    return "The source audio changed. Save a new clip recipe revision.";
  }
  if (error.code === "clip_word_alignment_not_ready") {
    return "Word-accurate cuts require a matching alignment that passed the H1 quality gate.";
  }
  if (error.code === "clip_source_audio_not_ready") {
    return "Attach ready delivery audio before creating a clip.";
  }
  if (error.code === "clip_source_audio_must_be_mp3") {
    return "The initial clip processor requires ready MP3 delivery audio.";
  }
  if (error.code === "clip_source_object_mismatch") {
    return "The private source object no longer matches its reviewed audio record.";
  }
  return error.message || error.code;
}

function isoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function datetimeLocalValue(value) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function integerOrNull(value) {
  return value === "" ? null : Number(value);
}

function moneyToCents(value) {
  return value === "" ? null : Math.round(Number(value) * 100);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "not set";
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
  if (bytes < 1_024) return `${Math.round(bytes)} bytes`;
  if (bytes < 1_024 ** 2) return `${(bytes / 1_024).toFixed(1)} KiB`;
  if (bytes < 1_024 ** 3) {
    return `${(bytes / (1_024 ** 2)).toFixed(1)} MiB`;
  }
  return `${(bytes / (1_024 ** 3)).toFixed(2)} GiB`;
}

function formatDurationMilliseconds(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 1) {
    return "duration unavailable";
  }
  return millisecondsToTimestamp(Math.round(milliseconds));
}

function publicationGateLabel(value) {
  if (value === "enforce") return "exact-snapshot gate enforced";
  if (value === "shadow") return "exact-snapshot gate in shadow";
  return "legacy Publish checks";
}

function formatInteger(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function humanizeCode(value) {
  return String(value || "").replace(/_/g, " ");
}

function fallbackMime(filename) {
  const value = String(filename).toLowerCase();
  if (value.endsWith(".mp3")) return "audio/mpeg";
  if (value.endsWith(".m4a")) return "audio/mp4";
  if (value.endsWith(".wav")) return "audio/wav";
  if (value.endsWith(".flac")) return "audio/flac";
  if (value.endsWith(".mov")) return "video/quicktime";
  if (value.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob(
    [`${JSON.stringify(value, null, 2)}\n`],
    { type: "application/json" }
  ));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
