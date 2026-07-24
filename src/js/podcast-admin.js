import { AdminApiClient, AdminApiError } from "./dust-wave-admin-shell/api-client.js";
import { mountRichTextEditor } from "./dust-wave-admin-shell/editor.js";
import { PasswordlessAdminSession } from "./dust-wave-admin-shell/passwordless-session.js";
import { mountAccessibleTabs } from "./dust-wave-admin-shell/tabs.js";

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
  const distributionRoot = root.querySelector("[data-podcast-distribution]");
  const billingRoot = root.querySelector("[data-podcast-billing]");
  const sponsorForm = root.querySelector("[data-podcast-sponsor-preview-form]");
  const sponsorStatus = root.querySelector("[data-podcast-sponsor-status]");
  const sponsorResult = root.querySelector("[data-podcast-sponsor-preview-result]");
  const campaignForm = root.querySelector("[data-podcast-campaign-form]");
  const campaignStatus = root.querySelector("[data-podcast-campaign-status]");
  const campaignList = root.querySelector("[data-podcast-campaign-list]");
  let shows = [];
  let episodes = [];
  let selectedShowId = "";
  let canManageCampaigns = false;
  let turnstileToken = "";
  let turnstileWidgetId;

  const notesEditor = mountRichTextEditor(
    root.querySelector("[data-podcast-notes-editor]"),
    { label: "Episode notes" }
  );
  mountAccessibleTabs(root.querySelector("[data-podcast-tabs]"), {
    storageKey: "dustwave-podcast-admin-tab",
    onSelect(tab) {
      if (tab === "distribution") loadDistribution();
      if (tab === "billing") loadBilling();
      if (tab === "sponsors") loadCampaigns();
    }
  });

  root.querySelector("[data-podcast-refresh]")?.addEventListener("click", loadShows);
  root.querySelector("[data-podcast-login-form]")?.addEventListener("submit", startLogin);
  logoutButton?.addEventListener("click", logout);
  showSelect?.addEventListener("change", async () => {
    selectedShowId = showSelect.value;
    fillShowForm();
    await Promise.all([loadEpisodes(), loadCampaigns()]);
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
  sponsorForm?.addEventListener("submit", previewSponsorDecision);
  campaignForm?.addEventListener("submit", createCampaign);
  campaignForm?.elements.campaignType?.addEventListener(
    "change",
    updateDirectSponsorFields
  );
  campaignList?.addEventListener("click", handleCampaignAction);
  episodeList?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-publish-episode]");
    if (!button) return;
    await publishEpisode(button.dataset.publishEpisode, button);
  });

  initializeTurnstile();
  initializeCampaignForm();
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
    campaignForm.hidden = !canManageCampaigns;
    root.querySelector("[data-podcast-session-summary]").textContent =
      `Authenticated Podcast administrator${roles ? ` — ${roles}` : ""}.`;
  }

  function showLoggedOut() {
    authPanel.hidden = false;
    app.hidden = true;
    logoutButton.hidden = true;
    shows = [];
    episodes = [];
    canManageCampaigns = false;
    sponsorResult?.replaceChildren();
    campaignList?.replaceChildren();
  }

  async function loadShows() {
    setStatus(globalStatus, "Loading shows…");
    try {
      const payload = await client.request("/v1/admin/shows");
      shows = payload.shows || [];
      selectedShowId = shows.some(({ id }) => id === selectedShowId)
        ? selectedShowId
        : shows[0]?.id || "";
      renderShows();
      fillShowSelect();
      fillShowForm();
      await Promise.all([loadEpisodes(), loadCampaigns()]);
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
      sponsorForm?.elements.episodeId
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
    const previewButton = sponsorForm?.querySelector('button[type="submit"]');
    if (previewButton) previewButton.disabled = episodes.length === 0;
    if (episodes.length === 0) {
      sponsorResult?.replaceChildren();
      setStatus(sponsorStatus, "Create an episode before previewing sponsor decisions.");
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
      campaignList?.replaceChildren();
      return;
    }
    campaignList.innerHTML = "<p>Loading sponsor campaigns…</p>";
    try {
      const payload = await client.request(
        `/v1/admin/ads/campaigns?showId=${encodeURIComponent(selectedShowId)}`
      );
      renderCampaigns(payload.campaigns || []);
    } catch (error) {
      campaignList.textContent = friendlyError(error);
    }
  }

  function renderCampaigns(campaigns) {
    if (!campaigns.length) {
      campaignList.innerHTML =
        '<p class="podcast-admin__empty">No sponsor or house-promo campaigns yet.</p>';
      return;
    }
    campaignList.replaceChildren(...campaigns.map((campaign) => {
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
