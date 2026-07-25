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
  let campaigns = [];
  let reconciliationRows = [];
  let reconciliationCursor = null;
  let reconciliationLoading = false;
  let reconciliationRequestId = 0;
  let selectedShowId = "";
  let canManageCampaigns = false;
  let canManageCreatives = false;
  let canManageAdPlans = false;
  let canEditTranscripts = false;
  let canApproveTranscripts = false;
  let canApproveClipYouTube = false;
  let transcript = null;
  let transcriptDurationSeconds = null;
  let transcriptRequestId = 0;
  let transcriptDirty = false;
  let transcriptPage = 0;
  const transcriptEditors = new Map();
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
      if (tab === "production") loadTranscript();
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
  root.querySelector("[data-podcast-login-form]")?.addEventListener("submit", startLogin);
  logoutButton?.addEventListener("click", logout);
  showSelect?.addEventListener("change", async () => {
    selectedShowId = showSelect.value;
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
    canApproveTranscripts = (identity?.roles || []).some(({ role }) =>
      role === "super_admin" || role === "admin"
    );
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
    campaigns = [];
    reconciliationRows = [];
    reconciliationCursor = null;
    reconciliationLoading = false;
    reconciliationRequestId += 1;
    canManageCampaigns = false;
    canManageCreatives = false;
    canManageAdPlans = false;
    canEditTranscripts = false;
    canApproveTranscripts = false;
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
      if (productionPanel && !productionPanel.hidden) await loadTranscript();
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
      transcriptEpisodeSelect
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
      setStatus(sponsorStatus, "Create an episode before previewing sponsor decisions.");
      setStatus(adPlanStatus, "Create an episode before defining ad markers.");
    } else {
      setStatus(sponsorStatus, "");
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
    } catch (error) {
      setStatus(adPlanStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function publishEpisode(episodeId, button) {
    button.disabled = true;
    setStatus(episodeStatus, "Publishing reviewed revision…");
    try {
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/publish`,
        { method: "POST", body: {} }
      );
      setStatus(
        episodeStatus,
        result.idempotent
          ? `Already published as revision ${result.publicationRevision}; no duplicate work was created.`
          : `Revision ${result.publicationRevision} ${result.status}. ${result.distributionTargets} directory states created.`
      );
      await loadEpisodes();
      await loadDistribution(episodeId);
    } catch (error) {
      setStatus(episodeStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function loadDistribution(episodeId) {
    distributionRoot.innerHTML = "<p>Loading distribution state…</p>";
    try {
      const path = episodeId
        ? `/v1/admin/episodes/${encodeURIComponent(episodeId)}/distribution`
        : "/v1/admin/distribution";
      const payload = await client.request(path);
      const list = document.createElement("div");
      list.className = "podcast-admin__directory-list";
      list.innerHTML = `<p><strong>Canonical feed:</strong> ${escapeHtml(payload.feedUrl)}</p>`;
      for (const destination of payload.destinations || []) {
        const row = document.createElement("article");
        row.innerHTML = `
          <div><strong>${escapeHtml(destination.name)}</strong><span>${escapeHtml(destination.mode)}</span></div>
          <div><span>${escapeHtml(destination.status || destination.owner_setup_status || "not started")}</span></div>`;
        list.append(row);
      }
      distributionRoot.replaceChildren(list);
    } catch (error) {
      distributionRoot.textContent = friendlyError(error);
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

function friendlyError(error) {
  if (!(error instanceof AdminApiError)) {
    return "The Podcast service could not be reached. Please retry.";
  }
  if (error.code === "admin_auth_not_configured") return "Staging login providers are not configured yet.";
  if (error.code === "invalid_csrf_token") return "Your secure session changed. Refresh and retry.";
  if (error.code === "episode_not_ready") return `Episode is not ready: ${(error.details?.missing || []).join(", ")}.`;
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
