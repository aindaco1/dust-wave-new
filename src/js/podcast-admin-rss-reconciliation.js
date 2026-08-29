import {
  createRssImportCutoverController
} from "./podcast-admin-rss-cutover.js";
import { appendDefinition } from "./podcast-admin-dom.js";

export function createRssImportReconciliationController({
  client,
  text,
  formatInteger,
  isSuperAdmin,
  friendlyError,
  setStatus,
  statusRoot
}) {
  const states = new Map();
  const cutover = createRssImportCutoverController({
    client,
    text,
    formatInteger,
    isSuperAdmin,
    friendlyError,
    setStatus,
    statusRoot,
    checkItem,
    appendBlockers,
    appendEvidence,
    confirmationCheckbox,
    callout
  });

  return {
    reset() {
      states.clear();
    },
    render(plan) {
      return renderBoundary(plan);
    }
  };

  function renderBoundary(plan) {
    const boundary = document.createElement("section");
    boundary.className =
      "podcast-admin__rss-import-reconciliation "
      + "podcast-admin__readiness-card";
    boundary.dataset.podcastRssImportReconciliation =
      String(plan.id || "");
    const heading = document.createElement("h4");
    heading.textContent = text("rssImportReconciliationHeading");
    const intro = document.createElement("p");
    intro.textContent = text("rssImportReconciliationIntro");
    boundary.append(heading, intro);
    const state = states.get(plan.id);
    if (state === undefined) {
      const load = actionButton("rssImportReconciliationLoad");
      load.addEventListener("click", () =>
        loadReconciliation(plan, boundary, load)
      );
      boundary.append(load);
      return boundary;
    }
    if (!state?.reconciliationAvailable) {
      boundary.append(callout("rssImportReconciliationUnavailable"));
      return boundary;
    }
    boundary.append(renderReadiness(state.readiness));
    if (state.approval) {
      boundary.append(renderApproval(state.approval));
    } else if (state.readiness?.readyForApproval && isSuperAdmin()) {
      boundary.append(renderApprovalForm(plan, boundary, state));
    }
    boundary.append(renderRedirectChecklist(
      plan,
      boundary,
      state
    ));
    const refresh = actionButton("rssImportReconciliationRefresh");
    refresh.addEventListener("click", () =>
      loadReconciliation(plan, boundary, refresh)
    );
    boundary.append(refresh);
    return boundary;
  }

  async function loadReconciliation(plan, boundary, button) {
    button.disabled = true;
    setStatus(statusRoot, text("rssImportReconciliationLoading"));
    try {
      const payload = await client.request(
        `/v1/admin/rss-import/plans/${
          encodeURIComponent(plan.id)
        }/reconciliation`
      );
      states.set(plan.id, payload);
      boundary.replaceWith(renderBoundary(plan));
      setStatus(statusRoot, "");
    } catch (error) {
      setStatus(statusRoot, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function renderReadiness(readiness = {}) {
    const root = document.createElement("div");
    root.className = "podcast-admin__rss-import-reconciliation-state";
    const summary = document.createElement("p");
    summary.textContent = text("rssImportReconciliationSummary", {
      state: readiness.copyReady
        ? text("rssImportReconciliationReady")
        : text("rssImportReconciliationBlocked"),
      items: formatInteger(readiness.itemCount),
      bytes: formatInteger(readiness.copiedBytes)
    });
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("rssImportReconciliationDigest"),
      readiness.evidenceSha256
    );
    appendEvidence(
      evidence,
      text("rssImportReconciliationPrePublication"),
      readiness.prePublicationReady
        ? text("rssImportReconciliationVerified")
        : text("rssImportReconciliationBlocked")
    );
    root.append(summary, evidence);
    appendBlockers(root, readiness.blockers);
    const items = document.createElement("div");
    items.className = "podcast-admin__rss-import-reconciliation-items";
    for (const item of Array.isArray(readiness.items)
      ? readiness.items
      : []) {
      const card = document.createElement("article");
      card.className = `podcast-admin__readiness-card ${
        item.copyReady ? "is-ready" : "is-missing"
      }`;
      const title = document.createElement("h5");
      title.textContent = String(
        item.targetSlug || text("notAvailable")
      );
      const itemSummary = document.createElement("p");
      itemSummary.textContent = text(
        "rssImportReconciliationItemSummary",
        {
          bytes: item.copiedBytes
            ? formatInteger(item.copiedBytes)
            : text("notAvailable"),
          mime: item.copiedMimeType || text("notAvailable")
        }
      );
      const checks = document.createElement("ul");
      checks.className = "podcast-admin__rss-import-checks";
      checks.append(
        checkItem(
          "rssImportReconciliationPrivateObject",
          item.privateObjectVerified
        ),
        checkItem(
          "rssImportReconciliationDraftIdentity",
          item.draftIdentityVerified
        ),
        checkItem(
          "rssImportReconciliationSourceUpload",
          item.sourceUploadVerified
        )
      );
      card.append(title, itemSummary, checks);
      appendBlockers(card, item.blockers);
      items.append(card);
    }
    root.append(items);
    return root;
  }

  function renderApproval(approval) {
    const card = document.createElement("div");
    card.className = "podcast-admin__callout";
    const heading = document.createElement("h5");
    heading.textContent = approval.fresh
      ? text("rssImportReconciliationApproved")
      : text("rssImportReconciliationApprovalStale");
    const evidence = document.createElement("p");
    evidence.textContent = text(
      "rssImportReconciliationApprovalEvidence",
      {
        items: formatInteger(approval.itemCount),
        bytes: formatInteger(approval.copiedBytes)
      }
    );
    card.append(heading, evidence);
    return card;
  }

  function renderApprovalForm(plan, boundary, state) {
    const form = document.createElement("form");
    form.className = "podcast-admin__form";
    form.dataset.podcastRssImportReconciliationForm = "";
    const confirmation = document.createElement("label");
    confirmation.className = "podcast-admin__checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "reconciliationConfirmed";
    checkbox.required = true;
    const confirmationText = document.createElement("span");
    confirmationText.textContent = text(
      "rssImportReconciliationConfirmation"
    );
    confirmation.append(checkbox, confirmationText);
    const notice = callout("rssImportReconciliationNoPublish");
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("rssImportApproveReconciliation");
    form.append(confirmation, notice, button);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!globalThis.confirm(
        text("rssImportReconciliationFinalConfirmation")
      )) {
        return;
      }
      button.disabled = true;
      setStatus(
        statusRoot,
        text("rssImportReconciliationApproving")
      );
      try {
        const payload = await client.request(
          `/v1/admin/rss-import/plans/${
            encodeURIComponent(plan.id)
          }/reconciliation`,
          {
            method: "POST",
            body: {
              reconciliationId: newReconciliationId(),
              expectedEvidenceSha256:
                state.readiness.evidenceSha256,
              reconciliationConfirmed: true
            }
          }
        );
        states.set(plan.id, payload);
        boundary.replaceWith(renderBoundary(plan));
        setStatus(
          statusRoot,
          text("rssImportReconciliationApprovalComplete")
        );
      } catch (error) {
        setStatus(statusRoot, friendlyError(error), true);
        button.disabled = false;
      }
    });
    return form;
  }

  function renderRedirectChecklist(plan, boundary, state) {
    const checklist = state.oldHostRedirectChecklist || {};
    const root = document.createElement("section");
    root.className = "podcast-admin__rss-import-redirect-checklist";
    const heading = document.createElement("h5");
    heading.textContent = text("rssImportRedirectChecklistHeading");
    const intro = document.createElement("p");
    intro.textContent = text("rssImportRedirectChecklistIntro");
    const feed = document.createElement("dl");
    feed.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      feed,
      text("rssImportRedirectOldFeed"),
      checklist.oldFeedDisplayUrl
    );
    appendEvidence(
      feed,
      text("rssImportRedirectNewFeed"),
      checklist.newFeedUrl
    );
    const checks = document.createElement("ul");
    checks.className = "podcast-admin__rss-import-checks";
    const values = checklist.checks || {};
    checks.append(
      checkItem(
        "rssImportRedirectOwnerReconciliation",
        values.ownerReconciliationApproved
      ),
      checkItem(
        "rssImportRedirectEpisodesPublic",
        values.importedEpisodesPublic
      ),
      checkItem(
        "rssImportRedirectFeedValidated",
        values.canonicalFeedRevalidated
      ),
      checkItem(
        "rssImportRedirectDirectoriesObserved",
        values.directoryCertificationReady
      ),
      checkItem(
        "rssImportRedirectOwnerAttestation",
        values.ownerRedirectAttested
      ),
      checkItem(
        "rssImportRedirectFinalApproval",
        values.finalActivationApproved
      )
    );
    root.append(heading, intro, feed, checks);
    if (checklist.attestation) {
      root.append(renderRedirectAttestation(checklist.attestation));
    }
    if (
      checklist.attestationAvailable
      && !checklist.attestation?.fresh
      && isSuperAdmin()
    ) {
      root.append(renderRedirectAttestationForm(
        plan,
        boundary,
        state
      ));
    }
    root.append(cutover.render(plan, boundary, state, (payload) => {
      states.set(plan.id, payload);
      boundary.replaceWith(renderBoundary(plan));
    }));
    appendBlockers(root, checklist.blockers);
    root.append(callout("rssImportRedirectUnavailable"));
    return root;
  }

  function renderRedirectAttestation(attestation) {
    const card = document.createElement("div");
    card.className = "podcast-admin__callout";
    const heading = document.createElement("h6");
    heading.textContent = attestation.fresh
      ? text("rssImportRedirectAttestationCurrent")
      : text("rssImportRedirectAttestationStale");
    const method = document.createElement("p");
    method.textContent = text(
      "rssImportRedirectAttestationMethod",
      {
        method: text(
          `rssImportRedirectMethod_${attestation.redirectMethod}`,
          String(attestation.redirectMethod || "").replaceAll("_", " ")
        )
      }
    );
    card.append(heading, method);
    return card;
  }

  function renderRedirectAttestationForm(plan, boundary, state) {
    const form = document.createElement("form");
    form.className = "podcast-admin__form";
    form.dataset.podcastRssImportRedirectAttestationForm = "";
    const feedLabel = document.createElement("label");
    feedLabel.textContent = text("rssImportRedirectAttestationFeedUrl");
    const feedInput = document.createElement("input");
    feedInput.type = "url";
    feedInput.inputMode = "url";
    feedInput.autocomplete = "off";
    feedInput.required = true;
    feedInput.name = "feedUrl";
    feedLabel.append(feedInput);
    const methodLabel = document.createElement("label");
    methodLabel.textContent = text("rssImportRedirectAttestationMethodLabel");
    const method = document.createElement("select");
    method.name = "redirectMethod";
    method.append(
      new Option(
        text("rssImportRedirectMethod_provider_managed_redirect"),
        "provider_managed_redirect"
      ),
      new Option(
        text("rssImportRedirectMethod_self_managed_http_301"),
        "self_managed_http_301"
      )
    );
    methodLabel.append(method);
    const ownerControl = confirmationCheckbox(
      "ownerControlConfirmed",
      "rssImportRedirectAttestationOwnerControl"
    );
    const permanence = confirmationCheckbox(
      "permanenceAcknowledged",
      "rssImportRedirectAttestationPermanence"
    );
    const noActivation = confirmationCheckbox(
      "noActivationConfirmed",
      "rssImportRedirectAttestationNoActivation"
    );
    const notice = callout("rssImportRedirectAttestationBoundary");
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("rssImportRedirectAttest");
    form.append(
      feedLabel,
      methodLabel,
      ownerControl,
      permanence,
      noActivation,
      notice,
      button
    );
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!globalThis.confirm(
        text("rssImportRedirectAttestationFinalConfirmation")
      )) {
        return;
      }
      button.disabled = true;
      setStatus(statusRoot, text("rssImportRedirectAttesting"));
      try {
        const payload = await client.request(
          `/v1/admin/rss-import/plans/${
            encodeURIComponent(plan.id)
          }/redirect-attestation`,
          {
            method: "POST",
            body: {
              attestationId: newAttestationId(),
              feedUrl: feedInput.value,
              expectedReconciliationEvidenceSha256:
                state.readiness.evidenceSha256,
              redirectMethod: method.value,
              ownerControlConfirmed: true,
              permanenceAcknowledged: true,
              noActivationConfirmed: true
            }
          }
        );
        states.set(plan.id, payload);
        boundary.replaceWith(renderBoundary(plan));
        setStatus(statusRoot, text("rssImportRedirectAttestationComplete"));
      } catch (error) {
        setStatus(statusRoot, friendlyError(error), true);
        button.disabled = false;
      }
    });
    return form;
  }

  function confirmationCheckbox(name, textKey) {
    const label = document.createElement("label");
    label.className = "podcast-admin__checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name;
    checkbox.required = true;
    const labelText = document.createElement("span");
    labelText.textContent = text(textKey);
    label.append(checkbox, labelText);
    return label;
  }

  function checkItem(labelKey, passed) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = text(labelKey);
    const state = document.createElement("strong");
    state.textContent = passed
      ? text("rssImportReconciliationVerified")
      : text("rssImportReconciliationPending");
    item.className = passed ? "is-ready" : "is-pending";
    item.append(label, state);
    return item;
  }

  function appendBlockers(root, blockers) {
    if (!Array.isArray(blockers) || blockers.length === 0) return;
    const list = document.createElement("ul");
    list.className = "podcast-admin__rss-import-blockers";
    for (const blocker of blockers) {
      const item = document.createElement("li");
      item.textContent = text(
        `rssImportReconciliationBlocker_${blocker}`,
        String(blocker || "").replaceAll("_", " ")
      );
      list.append(item);
    }
    root.append(list);
  }

  function appendEvidence(list, label, value) {
    appendDefinition(list, label, String(value || text("notAvailable")));
  }

  function actionButton(key) {
    const button = document.createElement("button");
    button.className = "btn btn-outline-light";
    button.type = "button";
    button.textContent = text(key);
    return button;
  }

  function callout(key) {
    const paragraph = document.createElement("p");
    paragraph.className = "podcast-admin__callout";
    paragraph.textContent = text(key);
    return paragraph;
  }

  function newReconciliationId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_reconciliation_${suffix}`;
  }

  function newAttestationId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_redirect_attestation_${suffix}`;
  }

}
