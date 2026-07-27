export function mountRssImportPreview({
  root,
  client,
  text,
  formatInteger,
  formatDate,
  isSuperAdmin,
  selectedShowId,
  friendlyError,
  setStatus
}) {
  const form = root.querySelector("[data-podcast-rss-import-form]");
  const status = root.querySelector("[data-podcast-rss-import-status]");
  const previewRoot = root.querySelector(
    "[data-podcast-rss-import-preview]"
  );

  form?.addEventListener("submit", previewImport);

  return {
    reset({ form: resetForm = false } = {}) {
      previewRoot?.replaceChildren();
      setStatus(status, "");
      if (resetForm) form?.reset();
    },
    setShow(available) {
      if (form) form.hidden = !available || !isSuperAdmin();
    }
  };

  async function previewImport(event) {
    event.preventDefault();
    const showId = selectedShowId();
    if (!showId || !isSuperAdmin() || !form) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    previewRoot?.replaceChildren();
    setStatus(status, text("rssImportPreviewing"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/rss-import/preview`,
        {
          method: "POST",
          body: {
            feedUrl: form.elements.feedUrl.value,
            ownershipConfirmed: form.elements.ownershipConfirmed.checked
          }
        }
      );
      renderPreview(payload);
      setStatus(status, text("rssImportPreviewComplete"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function renderPreview(payload) {
    if (!previewRoot) return;
    const preview = payload?.preview || {};
    const summary = document.createElement("section");
    summary.className = `podcast-admin__readiness-card ${
      Number(preview.migratableItemCount || 0) > 0
        ? "is-ready"
        : "is-missing"
    }`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = String(preview.title || text("notAvailable"));
    const state = document.createElement("span");
    state.className = "podcast-admin__pill";
    state.textContent = Number(preview.migratableItemCount || 0) > 0
      ? text("rssImportReady")
      : text("rssImportBlocked");
    heading.append(title, state);
    const description = document.createElement("p");
    description.textContent = text("rssImportSummary", {
      migratable: formatInteger(preview.migratableItemCount),
      items: formatInteger(preview.itemCount)
    });
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("rssImportSourceFeed"),
      preview.requestedUrl
    );
    appendEvidence(
      evidence,
      text("rssImportResolvedFeed"),
      preview.resolvedUrl
    );
    appendEvidence(
      evidence,
      text("rssImportRedirects"),
      formatInteger(preview.redirectCount)
    );
    appendEvidence(
      evidence,
      text("rssImportFeedDigest"),
      preview.feedSha256
    );
    appendEvidence(
      evidence,
      text("rssImportOwnerEmail"),
      preview.ownerEmailPresent
        ? text("rssImportPresent")
        : text("rssImportAbsent")
    );
    summary.append(heading, description, evidence);

    const episodes = document.createElement("div");
    episodes.className = "podcast-admin__readiness-list";
    const episodeRows = Array.isArray(preview.episodes)
      ? preview.episodes
      : [];
    if (episodeRows.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = text("rssImportNoItems");
      episodes.append(empty);
    } else {
      episodes.append(...episodeRows.map(renderEpisode));
    }
    previewRoot.replaceChildren(summary, episodes);
  }

  function renderEpisode(episode) {
    const card = document.createElement("article");
    card.className = `podcast-admin__readiness-card ${
      episode.migrationReady ? "is-ready" : "is-missing"
    }`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = String(episode.title || text("notAvailable"));
    const state = document.createElement("span");
    state.className = "podcast-admin__pill";
    state.textContent = episode.migrationReady
      ? text("rssImportReady")
      : text("rssImportBlocked");
    heading.append(title, state);
    const evidence = document.createElement("p");
    evidence.textContent = text("rssImportEpisodeEvidence", {
      date: episode.publishedAt
        ? formatDate(episode.publishedAt)
        : text("notAvailable"),
      mime: episode.enclosure?.mimeType || text("notAvailable"),
      bytes: episode.enclosure?.bytes
        ? formatInteger(episode.enclosure.bytes)
        : text("notAvailable")
    });
    card.append(heading, evidence);
    appendIssues(card, text("rssImportIssues"), episode.blockers);
    appendIssues(card, text("rssImportWarnings"), episode.warnings);
    return card;
  }

  function appendEvidence(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = String(value || text("notAvailable"));
    list.append(term, description);
  }

  function appendIssues(card, label, values) {
    if (!Array.isArray(values) || values.length === 0) return;
    const paragraph = document.createElement("p");
    paragraph.textContent = `${label}: ${values
      .map(issueText)
      .join("; ")}`;
    card.append(paragraph);
  }

  function issueText(value) {
    const code = String(value || "").trim();
    return text(
      `rssImportIssue_${code}`,
      code.replaceAll("_", " ")
    );
  }
}
