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
    container.append(statusNode());
  } else if (canPrepare) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__distribution-form podcast-admin__episode-youtube-form";
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
