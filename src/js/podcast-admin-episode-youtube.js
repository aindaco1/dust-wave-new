export function buildEpisodeYouTubeControls({
  channel,
  release,
  episodeId,
  episode,
  show,
  canPrepare,
  canApprove,
  publicationId,
  text,
  localizedCode,
  formatInteger
}) {
  if (!episode || !show) return null;
  const publication = channel.youtubePublication || null;
  const container = document.createElement("div");
  container.className = "podcast-admin__release-channel-actions";

  if (publication) {
    const state = document.createElement("p");
    state.textContent = text("episodeYoutubeEvidence", {
      status: localizedCode("youtubeStatus", publication.status),
      privacy: localizedCode("privacyStatus", publication.privacyStatus),
      bytes: formatInteger(
        Math.max(0, Number(publication.videoObjectBytes) || 0)
      )
    });
    container.append(state);
    if (publication.failureCode) {
      const failure = document.createElement("p");
      failure.className = "podcast-admin__status is-error";
      const code = String(publication.failureCode).replaceAll("_", " ");
      failure.textContent = publication.status === "reconciliation_required"
        ? text("episodeYoutubeReconciliation", { code })
        : text("episodeYoutubeFailure", { code });
      container.append(failure);
    }
    if (
      canApprove
      && ["draft", "dry_run", "failed"].includes(publication.status)
    ) {
      const approve = document.createElement("button");
      approve.className = "btn btn-danger";
      approve.type = "button";
      approve.dataset.podcastEpisodeYoutubeApprove = publication.id;
      approve.dataset.episodeId = episodeId;
      approve.textContent = text("approveEpisodeYoutubeTest");
      container.append(approve);
    }
    if (canApprove && publication.status === "reconciliation_required") {
      container.append(reconciliationForm({
        publication,
        episodeId,
        text
      }));
    } else {
      container.append(statusNode());
    }
  } else if (canPrepare) {
    const form = document.createElement("form");
    form.className = "podcast-admin__distribution-form podcast-admin__episode-youtube-form";
    form.dataset.podcastEpisodeYoutubeForm = "";
    form.dataset.episodeId = episodeId;
    form.dataset.publicationRevision = String(
      Number(release.publicationRevision) || 0
    );
    form.dataset.publicationId = publicationId;

    const title = document.createElement("input");
    title.name = "title";
    title.maxLength = 100;
    title.required = true;
    title.value = String(episode.title || "").slice(0, 100);

    const privacy = document.createElement("select");
    privacy.name = "privacyStatus";
    privacy.append(new Option(text("unlisted"), "unlisted"));

    const description = document.createElement("textarea");
    description.name = "description";
    description.maxLength = 5000;
    description.rows = 4;
    description.value = String(episode.summary || "").slice(0, 5000);

    const channelUrl = document.createElement("input");
    channelUrl.name = "confirmChannelUrl";
    channelUrl.type = "url";
    channelUrl.inputMode = "url";
    channelUrl.required = true;
    channelUrl.value = String(show.youtubeChannelUrl || "");

    const prepare = document.createElement("button");
    prepare.className = "btn btn-outline-light";
    prepare.type = "submit";
    prepare.textContent = text("prepareEpisodeYoutubeTest");
    form.append(
      labelNode(text("videoTitle"), title),
      labelNode(text("visibility"), privacy),
      labelNode(text("videoDescription"), description, true),
      labelNode(text("confirmChannel"), channelUrl, true),
      prepare,
      statusNode()
    );
    container.append(form);
  }
  return container.childElementCount ? container : null;
}

export async function handleEpisodeYouTubeSubmit({
  event,
  canPrepare,
  canReconcile,
  client,
  text,
  setStatus,
  friendlyError,
  loadDistribution
}) {
  const draftForm = event.target.closest(
    "[data-podcast-episode-youtube-form]"
  );
  const reconciliationForm = event.target.closest(
    "[data-podcast-episode-youtube-reconcile]"
  );
  const form = draftForm || reconciliationForm;
  if (!form) return;
  event.preventDefault();
  if (
    (draftForm && !canPrepare)
    || (reconciliationForm && !canReconcile)
  ) return;
  const episodeId = String(form.dataset.episodeId || "");
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector(
    "[data-podcast-episode-youtube-status]"
  );
  if (!episodeId || !button) return;
  if (draftForm) {
    const publicationRevision = Number(
      form.dataset.publicationRevision || 0
    );
    if (
      !Number.isSafeInteger(publicationRevision)
      || publicationRevision <= 0
    ) return;
  }
  button.disabled = true;
  try {
    if (draftForm) {
      const publicationRevision = Number(
        form.dataset.publicationRevision || 0
      );
      setStatus(status, text("preparingEpisodeYoutubeDraft"));
      const result = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/youtube`,
        {
          method: "POST",
          body: {
            publicationId: form.dataset.publicationId,
            expectedPublicationRevision: publicationRevision,
            title: form.elements.title.value,
            description: form.elements.description.value,
            privacyStatus: form.elements.privacyStatus.value,
            confirmChannelUrl: form.elements.confirmChannelUrl.value
          }
        }
      );
      setStatus(
        status,
        result.idempotent
          ? text("youtubeDraftExists")
          : text("episodeYoutubeDraftPrepared")
      );
    } else {
      const publicationId = String(form.dataset.publicationId || "");
      const outcome = form.elements.outcome.value;
      if (!publicationId || !form.elements.confirmation.checked) {
        setStatus(status, text("episodeYoutubeReconcileConfirm"), true);
        button.disabled = false;
        return;
      }
      const providerVideoId = form.elements.providerVideoId.value.trim();
      if (outcome === "uploaded" && !providerVideoId) {
        setStatus(status, text("episodeYoutubeProviderIdRequired"), true);
        button.disabled = false;
        return;
      }
      setStatus(status, text("reconcilingEpisodeYoutube"));
      await client.request(
        `/v1/admin/episode-youtube-publications/${encodeURIComponent(
          publicationId
        )}/reconcile`,
        {
          method: "POST",
          body: {
            outcome,
            providerVideoId,
            confirmation: outcome === "uploaded"
              ? "CONFIRM_VERIFIED_UNLISTED_VIDEO"
              : "CONFIRM_NO_CHANNEL_VIDEO_REMAINS"
          }
        }
      );
    }
    await loadDistribution(episodeId);
  } catch (error) {
    setStatus(status, friendlyError(error), true);
    button.disabled = false;
  }
}

export async function handleEpisodeYouTubeApproval({
  button,
  authorized,
  client,
  text,
  setStatus,
  friendlyError,
  loadDistribution
}) {
  if (!authorized) return;
  const publicationId = String(
    button.dataset.podcastEpisodeYoutubeApprove || ""
  );
  const episodeId = String(button.dataset.episodeId || "");
  if (!publicationId || !episodeId) return;
  const status = button.parentElement?.querySelector(
    "[data-podcast-episode-youtube-status]"
  );
  if (!window.confirm(text("approveEpisodeYoutubeConfirm"))) return;
  button.disabled = true;
  setStatus(status, text("approvingYoutubeTest"));
  try {
    await client.request(
      `/v1/admin/episode-youtube-publications/${encodeURIComponent(
        publicationId
      )}/approve`,
      { method: "POST", body: {} }
    );
    await loadDistribution(episodeId);
  } catch (error) {
    setStatus(status, friendlyError(error), true);
    button.disabled = false;
  }
}

function labelNode(text, field, wide = false) {
  const label = document.createElement("label");
  if (wide) label.className = "podcast-admin__distribution-form-wide";
  label.append(document.createTextNode(text), field);
  return label;
}

function statusNode() {
  const status = document.createElement("p");
  status.className = "podcast-admin__status";
  status.dataset.podcastEpisodeYoutubeStatus = "";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  return status;
}

function reconciliationForm({ publication, episodeId, text }) {
  const form = document.createElement("form");
  form.className = "podcast-admin__distribution-form podcast-admin__episode-youtube-form";
  form.dataset.podcastEpisodeYoutubeReconcile = "";
  form.dataset.publicationId = publication.id;
  form.dataset.episodeId = episodeId;

  const outcome = document.createElement("select");
  outcome.name = "outcome";
  outcome.append(
    new Option(text("episodeYoutubeFoundVideo"), "uploaded"),
    new Option(text("episodeYoutubeNoVideo"), "not_uploaded")
  );

  const providerVideoId = document.createElement("input");
  providerVideoId.name = "providerVideoId";
  providerVideoId.maxLength = 64;
  providerVideoId.autocomplete = "off";
  providerVideoId.placeholder = text("episodeYoutubeProviderIdPlaceholder");

  const confirmation = document.createElement("input");
  confirmation.name = "confirmation";
  confirmation.type = "checkbox";
  const confirmationLabel = document.createElement("label");
  confirmationLabel.className = "podcast-admin__checkbox "
    + "podcast-admin__distribution-form-wide";
  confirmationLabel.append(
    confirmation,
    document.createTextNode(` ${text("episodeYoutubeManualInspection")}`)
  );

  const submit = document.createElement("button");
  submit.className = "btn btn-danger";
  submit.type = "submit";
  submit.textContent = text("reconcileEpisodeYoutube");
  form.append(
    labelNode(text("episodeYoutubeOutcome"), outcome),
    labelNode(text("episodeYoutubeProviderId"), providerVideoId),
    confirmationLabel,
    submit,
    statusNode()
  );
  return form;
}
