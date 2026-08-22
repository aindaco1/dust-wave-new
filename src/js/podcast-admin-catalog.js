import {
  createContextualEditButton
} from "./podcast-admin-contextual-editing.js";

export function renderShowCatalog({
  target,
  shows,
  text,
  localizedCode,
  escapeHtml,
  escapeAttribute,
  canEdit = false
}) {
  target.replaceChildren(...shows.map((show) => {
    const card = document.createElement("article");
    card.className = "podcast-admin__card";
    card.innerHTML = `
      <p class="podcast-admin__pill">${escapeHtml(localizedCode("showStatus", show.status))}</p>
      <h3>${escapeHtml(show.title)}</h3>
      <p>${escapeHtml(show.description)}</p>
      <dl>
        <div><dt>${escapeHtml(text("episodesLabel"))}</dt><dd>${Number(show.episodeCount || 0)}</dd></div>
        <div><dt>${escapeHtml(text("earlyAccessLabel"))}</dt><dd>${show.earlyAccessDays ?? "—"} ${escapeHtml(text("daysUnit"))}</dd></div>
        <div><dt>${escapeHtml(text("premiumLabel"))}</dt><dd>${escapeHtml(show.premiumEnabled
          ? text("configured")
          : text("off"))}</dd></div>
      </dl>
      <div class="podcast-admin__clip-actions" data-podcast-show-actions>
        <a class="btn btn-outline-light" href="${escapeAttribute(show.canonicalUrl)}">${escapeHtml(text("canonicalShowPage"))}</a>
      </div>`;
    if (canEdit) {
      card.querySelector("[data-podcast-show-actions]")?.prepend(
        createContextualEditButton({
          document: target.ownerDocument || document,
          type: "show",
          id: show.id,
          label: text("editShow"),
          accessibleLabel: text("editShowLabel", { title: show.title })
        })
      );
    }
    return card;
  }));
}

export function renderEpisodeCatalog({
  target,
  episodes,
  text,
  localizedCode,
  escapeHtml,
  escapeAttribute,
  formatDate,
  canEdit = false
}) {
  if (!episodes.length) {
    const empty = document.createElement("p");
    empty.className = "podcast-admin__empty";
    empty.textContent = text("noEpisodeRecords");
    target.replaceChildren(empty);
    return;
  }
  target.replaceChildren(...episodes.map((episode) => {
    const row = document.createElement("article");
    row.className = "podcast-admin__episode";
    row.innerHTML = `
      <div>
        <p class="podcast-admin__pill">${escapeHtml(localizedCode("episodeStatus", episode.status))} · ${escapeHtml(localizedCode("episodeAccess", episode.access))}</p>
        <h3>${escapeHtml(episode.title)}</h3>
        <p>${escapeHtml(episode.summary)}</p>
        <p>${escapeHtml(text("mediaLabel"))}: ${escapeHtml(localizedCode("mediaStatus", episode.mediaStatus))}${episode.audioFilename ? ` · ${escapeHtml(episode.audioFilename)}` : ""}</p>
        <p>${escapeHtml(text("sourceLanguageLabel"))}: ${escapeHtml(localizedCode("language", episode.sourceLanguage || "not_set"))} · ${escapeHtml(text("revisionLabel"))}: ${Number(episode.publicationRevision || 0)} · ${escapeHtml(text("publicLabel"))}: ${escapeHtml(formatDate(episode.publicAt))}</p>
      </div>
      <div class="podcast-admin__episode-actions">
        ${canEdit ? `<button class="btn btn-outline-light" type="button" data-edit-episode="${escapeAttribute(episode.id)}">${escapeHtml(text("editEpisode"))}</button>` : ""}
        <a class="btn btn-outline-light" href="${escapeAttribute(episode.canonicalUrl)}">${escapeHtml(text("page"))}</a>
        <button class="btn btn-danger" type="button" data-review-episode="${escapeAttribute(episode.id)}">${escapeHtml(text("reviewAndPublish"))}</button>
      </div>`;
    return row;
  }));
}
