import {
  createRssImportReconciliationController
} from "./podcast-admin-rss-reconciliation.js";

export function assessPodcastGuidCompatibility(
  targetPodcastGuid,
  preview
) {
  if (preview?.podcastGuidStatus === "absent") {
    return { ready: true, state: "absent" };
  }
  if (
    preview?.podcastGuidStatus !== "valid"
    || typeof preview.podcastGuid !== "string"
  ) {
    return { ready: false, state: "invalid" };
  }
  if (typeof targetPodcastGuid !== "string" || !targetPodcastGuid) {
    return { ready: false, state: "unassigned" };
  }
  return preview.podcastGuid === targetPodcastGuid
    ? { ready: true, state: "match" }
    : { ready: false, state: "mismatch" };
}

export function mountRssImportWorkbench({
  root,
  client,
  text,
  formatInteger,
  formatDate,
  isSuperAdmin,
  selectedShowId,
  selectedShowLanguage,
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
  const executions = new Map();
  const reconciliation = createRssImportReconciliationController({
    client,
    text,
    formatInteger,
    isSuperAdmin,
    friendlyError,
    setStatus,
    statusRoot: status
  });
  let loadRequestId = 0;

  form?.addEventListener("submit", previewImport);

  return {
    reset({ form: resetForm = false } = {}) {
      loadRequestId += 1;
      latestPreview = null;
      plans = [];
      executions.clear();
      reconciliation.reset();
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
    const podcastGuidAssessment = assessPodcastGuidCompatibility(
      payload?.show?.podcastGuid,
      preview
    );
    const migrationReady = (
      Number(preview.migratableItemCount || 0) > 0
      && podcastGuidAssessment.ready
    );
    const summary = document.createElement("section");
    summary.className = `podcast-admin__readiness-card ${
      migrationReady ? "is-ready" : "is-missing"
    }`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h4");
    title.textContent = String(preview.title || text("notAvailable"));
    const state = document.createElement("span");
    state.className = "podcast-admin__pill";
    state.textContent = migrationReady
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
    appendEvidence(
      evidence,
      text("rssImportSourcePodcastGuid"),
      preview.podcastGuidStatus === "valid"
        ? preview.podcastGuid
        : podcastGuidStateText(preview.podcastGuidStatus)
    );
    appendEvidence(
      evidence,
      text("rssImportTargetPodcastGuid"),
      payload?.show?.podcastGuid || text("notAvailable")
    );
    appendEvidence(
      evidence,
      text("rssImportPodcastGuidStatus"),
      podcastGuidStateText(podcastGuidAssessment.state)
    );
    summary.append(heading, description, evidence);
    if (!podcastGuidAssessment.ready) {
      const identityBlocker = document.createElement("div");
      identityBlocker.className = "podcast-admin__callout";
      const explanation = document.createElement("p");
      explanation.textContent = podcastGuidStateText(
        podcastGuidAssessment.state
      );
      identityBlocker.append(explanation);
      summary.append(identityBlocker);
    }

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
      episodes.append(...episodeRows.map((episode) =>
        renderEpisode(episode, podcastGuidAssessment.ready)
      ));
    }
    const selection = renderSelectionControls(
      episodeRows,
      podcastGuidAssessment.ready
    );
    previewRoot.replaceChildren(
      summary,
      episodes,
      ...(selection ? [selection] : [])
    );
  }

  function renderEpisode(episode, identityReady) {
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
    if (episode.migrationReady && identityReady) {
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

  function renderSelectionControls(episodeRows, identityReady) {
    if (
      !isSuperAdmin()
      || !identityReady
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
      text("rssImportSourcePodcastGuid"),
      plan.sourcePodcastGuid || text("rssImportPodcastGuidAbsent")
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
    if (plan.status === "reviewed") {
      card.append(renderExecutionBoundary(plan));
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
    if (!executions.get(plan.id)?.execution) {
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
    }
    return controls;
  }

  function renderExecutionBoundary(plan) {
    const boundary = document.createElement("section");
    boundary.className =
      "podcast-admin__rss-import-execution podcast-admin__readiness-card";
    const heading = document.createElement("h4");
    heading.textContent = text("rssImportExecutionHeading");
    const explanation = document.createElement("p");
    explanation.textContent = text("rssImportExecutionIntro");
    boundary.append(heading, explanation);
    const state = executions.get(plan.id);
    if (state === undefined) {
      const button = document.createElement("button");
      button.className = "btn btn-outline-light";
      button.type = "button";
      button.textContent = text("rssImportExecutionLoad");
      button.addEventListener("click", () =>
        loadExecution(plan, button)
      );
      boundary.append(button);
      return boundary;
    }
    if (!state.executionAvailable && !state.execution) {
      const unavailable = document.createElement("p");
      unavailable.className = "podcast-admin__callout";
      unavailable.textContent = text("rssImportExecutionUnavailable");
      boundary.append(unavailable);
      return boundary;
    }
    if (state.execution) {
      boundary.append(renderExecutionState(state.execution));
      const refresh = document.createElement("button");
      refresh.className = "btn btn-outline-light";
      refresh.type = "button";
      refresh.textContent = text("rssImportExecutionRefresh");
      refresh.addEventListener("click", () =>
        loadExecution(plan, refresh)
      );
      boundary.append(refresh);
      boundary.append(reconciliation.render(plan));
      return boundary;
    }
    if (isSuperAdmin()) {
      boundary.append(renderExecutionForm(plan));
    } else {
      const empty = document.createElement("p");
      empty.textContent = text("rssImportExecutionEmpty");
      boundary.append(empty);
    }
    return boundary;
  }

  async function loadExecution(plan, button) {
    button.disabled = true;
    setStatus(status, text("rssImportExecutionLoading"));
    try {
      const payload = await client.request(
        `/v1/admin/rss-import/plans/${
          encodeURIComponent(plan.id)
        }/execution`
      );
      executions.set(plan.id, payload);
      renderPlans();
      setStatus(status, "");
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function renderExecutionForm(plan) {
    const executionForm = document.createElement("form");
    executionForm.className = "podcast-admin__form";
    executionForm.dataset.podcastRssImportExecutionForm = "";
    const feedLabel = document.createElement("label");
    feedLabel.textContent = text("rssImportExecutionFeedUrl");
    const feedInput = document.createElement("input");
    feedInput.type = "url";
    feedInput.inputMode = "url";
    feedInput.autocomplete = "off";
    feedInput.required = true;
    feedInput.name = "feedUrl";
    feedLabel.append(feedInput);
    const mappingHeading = document.createElement("h4");
    mappingHeading.textContent = text("rssImportExecutionMapping");
    executionForm.append(feedLabel, mappingHeading);
    const usedSlugs = new Set();
    for (const item of Array.isArray(plan.items) ? plan.items : []) {
      const mapping = document.createElement("div");
      mapping.className =
        "podcast-admin__field-grid podcast-admin__rss-import-mapping";
      mapping.dataset.podcastRssImportExecutionItem =
        String(item.sourceIdentitySha256 || "");
      const slugLabel = document.createElement("label");
      slugLabel.textContent = text("rssImportExecutionTargetSlug", {
        title: item.title || text("notAvailable")
      });
      const slugInput = document.createElement("input");
      slugInput.name = "targetSlug";
      slugInput.required = true;
      slugInput.maxLength = 120;
      slugInput.pattern = "[a-z0-9]+(?:-[a-z0-9]+)*";
      slugInput.value = uniqueImportSlug(
        item.title,
        item.sourceIdentitySha256,
        usedSlugs
      );
      slugLabel.append(slugInput);
      const languageLabel = document.createElement("label");
      languageLabel.textContent = text("sourceLanguageLabel");
      const language = document.createElement("select");
      language.name = "sourceLanguage";
      language.append(
        new Option(text("language_es"), "es"),
        new Option(text("language_en"), "en")
      );
      language.value = selectedShowLanguage() === "en" ? "en" : "es";
      languageLabel.append(language);
      mapping.append(slugLabel, languageLabel);
      executionForm.append(mapping);
    }
    const confirmation = document.createElement("label");
    confirmation.className = "podcast-admin__checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.required = true;
    checkbox.name = "executionConfirmed";
    const confirmationText = document.createElement("span");
    confirmationText.textContent = text("rssImportExecutionConfirmation");
    confirmation.append(checkbox, confirmationText);
    const callout = document.createElement("p");
    callout.className = "podcast-admin__callout";
    callout.textContent = text("rssImportExecutionNoPublish");
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("rssImportExecutePlan");
    executionForm.append(confirmation, callout, button);
    executionForm.addEventListener("submit", (event) =>
      executePlan(event, plan, executionForm, button)
    );
    return executionForm;
  }

  async function executePlan(event, plan, executionForm, button) {
    event.preventDefault();
    if (!executionForm.reportValidity()) return;
    if (!globalThis.confirm(text("rssImportExecutionFinalConfirmation"))) {
      return;
    }
    button.disabled = true;
    setStatus(status, text("rssImportExecutionQueueing"));
    const items = [...executionForm.querySelectorAll(
      "[data-podcast-rss-import-execution-item]"
    )].map((mapping) => ({
      sourceIdentitySha256:
        mapping.dataset.podcastRssImportExecutionItem,
      targetSlug: mapping.querySelector('[name="targetSlug"]').value,
      sourceLanguage:
        mapping.querySelector('[name="sourceLanguage"]').value
    }));
    try {
      const payload = await client.request(
        `/v1/admin/rss-import/plans/${
          encodeURIComponent(plan.id)
        }/execution`,
        {
          method: "POST",
          body: {
            executionId: newExecutionId(),
            feedUrl: executionForm.elements.feedUrl.value,
            expectedFeedSha256: plan.feedSha256,
            expectedSelectionSha256: plan.selectionSha256,
            executionConfirmed:
              executionForm.elements.executionConfirmed.checked,
            items
          }
        }
      );
      executions.set(plan.id, {
        execution: payload.execution,
        executionAvailable: true
      });
      renderPlans();
      setStatus(status, text("rssImportExecutionQueued"));
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function renderExecutionState(execution) {
    const state = document.createElement("div");
    const summary = document.createElement("p");
    summary.textContent = text("rssImportExecutionSummary", {
      status: text(
        `rssImportExecutionStatus_${execution.status}`,
        execution.status
      ),
      copied: formatInteger(execution.copiedItemCount),
      drafts: formatInteger(execution.draftItemCount),
      failed: formatInteger(execution.failedItemCount),
      expected: formatInteger(execution.expectedItemCount)
    });
    state.append(summary);
    const list = document.createElement("ul");
    for (const item of Array.isArray(execution.items)
      ? execution.items
      : []) {
      const entry = document.createElement("li");
      entry.textContent = text("rssImportExecutionItemSummary", {
        slug: item.targetSlug || text("notAvailable"),
        status: text(
          `rssImportExecutionItemStatus_${item.status}`,
          item.status
        ),
        bytes: item.copiedBytes
          ? formatInteger(item.copiedBytes)
          : text("notAvailable")
      });
      if (item.lastErrorCode) {
        const error = document.createElement("span");
        error.textContent = ` · ${text(
          `error_${item.lastErrorCode}`,
          item.lastErrorCode
        )}`;
        entry.append(error);
      }
      list.append(entry);
    }
    const callout = document.createElement("p");
    callout.className = "podcast-admin__callout";
    callout.textContent = text("rssImportExecutionNoPublish");
    state.append(list, callout);
    return state;
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

  function podcastGuidStateText(state) {
    if (state === "absent") return text("rssImportPodcastGuidAbsent");
    if (state === "match") return text("rssImportPodcastGuidMatch");
    if (state === "unassigned") {
      return text("rssImportPodcastGuidUnassigned");
    }
    if (state === "mismatch") {
      return text("rssImportPodcastGuidMismatch");
    }
    return text("rssImportPodcastGuidInvalid");
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

  function newExecutionId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_execution_${suffix}`;
  }

  function uniqueImportSlug(title, identity, used) {
    const base = String(title || "")
      .normalize("NFKD")
      .replace(/\p{Mark}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 100)
      || `episode-${String(identity || "").slice(0, 12)}`;
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base.slice(0, 110)}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  }
}
