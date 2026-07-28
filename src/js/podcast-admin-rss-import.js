export function mountRssImportWorkbench({
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
  const planSection = root.querySelector(
    "[data-podcast-rss-import-plan-section]"
  );
  const planRoot = root.querySelector("[data-podcast-rss-import-plans]");
  let latestPreview = null;
  let plans = [];
  let loadRequestId = 0;

  form?.addEventListener("submit", previewImport);

  return {
    reset({ form: resetForm = false } = {}) {
      loadRequestId += 1;
      latestPreview = null;
      plans = [];
      previewRoot?.replaceChildren();
      planRoot?.replaceChildren();
      setStatus(status, "");
      if (resetForm) form?.reset();
    },
    setShow(available) {
      if (form) form.hidden = !available || !isSuperAdmin();
      if (planSection) planSection.hidden = !available;
      if (available) loadPlans();
    }
  };

  async function loadPlans() {
    const showId = selectedShowId();
    if (!showId || !planRoot) return;
    const requestId = ++loadRequestId;
    renderPlanMessage(text("rssImportPlansLoading"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/rss-import/plans`
      );
      if (requestId !== loadRequestId || showId !== selectedShowId()) return;
      plans = Array.isArray(payload?.plans) ? payload.plans : [];
      renderPlans();
    } catch (error) {
      if (requestId !== loadRequestId) return;
      renderPlanMessage(friendlyError(error), true);
    }
  }

  async function previewImport(event) {
    event.preventDefault();
    const showId = selectedShowId();
    if (!showId || !isSuperAdmin() || !form) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    latestPreview = null;
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
      latestPreview = payload?.preview || null;
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
    const selection = renderSelectionControls(episodeRows);
    previewRoot.replaceChildren(
      summary,
      episodes,
      ...(selection ? [selection] : [])
    );
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
    if (episode.migrationReady) {
      const label = document.createElement("label");
      label.className = "podcast-admin__checkbox";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(episode.sourceIdentitySha256 || "");
      input.dataset.podcastRssImportSelect = "";
      input.addEventListener("change", updateSelectionButton);
      const labelText = document.createElement("span");
      labelText.textContent = text("rssImportSelectEpisode", {
        title: episode.title || text("notAvailable")
      });
      label.append(input, labelText);
      card.append(label);
    }
    appendIssues(card, text("rssImportIssues"), episode.blockers);
    appendIssues(card, text("rssImportWarnings"), episode.warnings);
    return card;
  }

  function renderSelectionControls(episodeRows) {
    if (
      !isSuperAdmin()
      || !episodeRows.some(({ migrationReady }) => migrationReady)
    ) {
      return null;
    }
    const controls = document.createElement("section");
    controls.className =
      "podcast-admin__review-controls podcast-admin__readiness-card";
    const heading = document.createElement("h4");
    heading.textContent = text("rssImportPrepareHeading");
    const explanation = document.createElement("p");
    explanation.textContent = text("rssImportPrepareIntro");
    const button = document.createElement("button");
    button.className = "btn btn-outline-light";
    button.type = "button";
    button.dataset.podcastRssImportPrepare = "";
    button.disabled = true;
    button.textContent = text("rssImportPrepareSelection", { count: 0 });
    button.addEventListener("click", preparePlan);
    controls.append(heading, explanation, button);
    return controls;
  }

  function updateSelectionButton() {
    const button = previewRoot?.querySelector(
      "[data-podcast-rss-import-prepare]"
    );
    if (!button) return;
    const count = selectedIdentities().length;
    button.disabled = count < 1;
    button.textContent = text("rssImportPrepareSelection", { count });
  }

  function selectedIdentities() {
    return [...(previewRoot?.querySelectorAll(
      "[data-podcast-rss-import-select]:checked"
    ) || [])].map(({ value }) => value);
  }

  async function preparePlan() {
    const showId = selectedShowId();
    const selected = selectedIdentities();
    const button = previewRoot?.querySelector(
      "[data-podcast-rss-import-prepare]"
    );
    if (
      !showId
      || !isSuperAdmin()
      || !form
      || !latestPreview?.feedSha256
      || selected.length < 1
      || !button
    ) {
      return;
    }
    button.disabled = true;
    setStatus(status, text("rssImportPlanPreparing"));
    try {
      const payload = await client.request(
        `/v1/admin/shows/${encodeURIComponent(showId)}/rss-import/plans`,
        {
          method: "POST",
          body: {
            planId: newPlanId(),
            feedUrl: form.elements.feedUrl.value,
            ownershipConfirmed: form.elements.ownershipConfirmed.checked,
            expectedFeedSha256: latestPreview.feedSha256,
            selectedSourceIdentitySha256: selected
          }
        }
      );
      upsertPlan(payload.plan);
      renderPlans();
      setStatus(status, text("rssImportPlanPrepared"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function renderPlans() {
    if (!planRoot) return;
    if (plans.length === 0) {
      renderPlanMessage(text("rssImportPlansEmpty"));
      return;
    }
    planRoot.replaceChildren(...plans.map(renderPlan));
  }

  function renderPlan(plan) {
    const card = document.createElement("article");
    card.className = `podcast-admin__readiness-card ${
      plan.status === "reviewed"
        ? "is-ready"
        : plan.status === "canceled"
          ? "is-missing"
          : "is-pending"
    }`;
    card.dataset.podcastRssImportPlan = String(plan.id || "");
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = String(plan.feedTitle || text("notAvailable"));
    const state = document.createElement("span");
    state.className = "podcast-admin__pill";
    state.textContent = text(
      `rssImportPlanStatus_${plan.status}`,
      String(plan.status || text("notAvailable"))
    );
    heading.append(title, state);
    const summary = document.createElement("p");
    summary.textContent = text("rssImportPlanSummary", {
      selected: formatInteger(plan.selectedItemCount),
      date: plan.updatedAt ? formatDate(plan.updatedAt) : text("notAvailable")
    });
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("rssImportSourceFeed"),
      plan.requestedFeedUrl
    );
    appendEvidence(
      evidence,
      text("rssImportFeedDigest"),
      plan.feedSha256
    );
    appendEvidence(
      evidence,
      text("rssImportSelectionDigest"),
      plan.selectionSha256
    );
    const details = document.createElement("details");
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = text("rssImportPlanItems", {
      count: formatInteger(plan.selectedItemCount)
    });
    const itemList = document.createElement("ul");
    for (const item of Array.isArray(plan.items) ? plan.items : []) {
      const entry = document.createElement("li");
      entry.textContent = text("rssImportPlanItemEvidence", {
        title: item.title || text("notAvailable"),
        date: item.publishedAt
          ? formatDate(item.publishedAt)
          : text("notAvailable"),
        mime: item.enclosure?.mimeType || text("notAvailable")
      });
      itemList.append(entry);
    }
    details.append(detailsSummary, itemList);
    card.append(heading, summary, evidence, details);
    if (isSuperAdmin() && plan.status !== "canceled") {
      card.append(renderPlanActions(plan));
    }
    return card;
  }

  function renderPlanActions(plan) {
    const controls = document.createElement("div");
    controls.className = "podcast-admin__review-controls";
    if (plan.status === "draft") {
      const feedLabel = document.createElement("label");
      feedLabel.textContent = text("rssImportReviewFeedUrl");
      const feedInput = document.createElement("input");
      feedInput.type = "url";
      feedInput.inputMode = "url";
      feedInput.autocomplete = "off";
      feedInput.required = true;
      feedInput.dataset.podcastRssImportReviewFeed = "";
      feedLabel.append(feedInput);
      const confirmation = document.createElement("label");
      confirmation.className = "podcast-admin__checkbox";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.podcastRssImportReviewConfirmed = "";
      const confirmationText = document.createElement("span");
      confirmationText.textContent = text("rssImportReviewConfirmation");
      confirmation.append(checkbox, confirmationText);
      const reviewButton = document.createElement("button");
      reviewButton.className = "btn btn-outline-light";
      reviewButton.type = "button";
      reviewButton.textContent = text("rssImportReviewPlan");
      reviewButton.addEventListener("click", () =>
        reviewPlan(plan, controls, reviewButton)
      );
      controls.append(feedLabel, confirmation, reviewButton);
    }
    const cancelLabel = document.createElement("label");
    cancelLabel.textContent = text("rssImportCancelReason");
    const cancelInput = document.createElement("input");
    cancelInput.type = "text";
    cancelInput.maxLength = 500;
    cancelInput.required = true;
    cancelInput.dataset.podcastRssImportCancelReason = "";
    cancelLabel.append(cancelInput);
    const cancelButton = document.createElement("button");
    cancelButton.className = "btn btn-outline-light";
    cancelButton.type = "button";
    cancelButton.textContent = text("rssImportCancelPlan");
    cancelButton.addEventListener("click", () =>
      cancelPlan(plan, controls, cancelButton)
    );
    controls.append(cancelLabel, cancelButton);
    return controls;
  }

  async function reviewPlan(plan, controls, button) {
    const feedInput = controls.querySelector(
      "[data-podcast-rss-import-review-feed]"
    );
    const confirmation = controls.querySelector(
      "[data-podcast-rss-import-review-confirmed]"
    );
    if (!feedInput?.checkValidity()) {
      feedInput?.reportValidity();
      return;
    }
    if (!confirmation?.checked) {
      setStatus(status, text("rssImportReviewConfirmationNeeded"), true);
      confirmation?.focus();
      return;
    }
    button.disabled = true;
    setStatus(status, text("rssImportPlanReviewing"));
    try {
      const payload = await client.request(
        `/v1/admin/rss-import/plans/${encodeURIComponent(plan.id)}/review`,
        {
          method: "POST",
          body: {
            feedUrl: feedInput.value,
            ownershipConfirmed: true,
            expectedFeedSha256: plan.feedSha256,
            expectedSelectionSha256: plan.selectionSha256,
            reviewConfirmed: true
          }
        }
      );
      upsertPlan(payload.plan);
      renderPlans();
      setStatus(status, text("rssImportPlanReviewed"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  async function cancelPlan(plan, controls, button) {
    const reason = controls.querySelector(
      "[data-podcast-rss-import-cancel-reason]"
    );
    if (!reason?.checkValidity()) {
      reason?.reportValidity();
      return;
    }
    if (!globalThis.confirm(text("rssImportCancelConfirmation"))) return;
    button.disabled = true;
    setStatus(status, text("rssImportPlanCanceling"));
    try {
      const payload = await client.request(
        `/v1/admin/rss-import/plans/${encodeURIComponent(plan.id)}/cancel`,
        {
          method: "POST",
          body: {
            expectedSelectionSha256: plan.selectionSha256,
            reason: reason.value
          }
        }
      );
      upsertPlan(payload.plan);
      renderPlans();
      setStatus(status, text("rssImportPlanCanceled"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function upsertPlan(plan) {
    if (!plan?.id) return;
    plans = [
      plan,
      ...plans.filter(({ id }) => id !== plan.id)
    ].slice(0, 10);
  }

  function renderPlanMessage(message, isError = false) {
    if (!planRoot) return;
    const paragraph = document.createElement("p");
    paragraph.className = "podcast-admin__status";
    if (isError) paragraph.classList.add("is-error");
    paragraph.textContent = message;
    planRoot.replaceChildren(paragraph);
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

  function newPlanId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_import_${suffix}`;
  }
}
