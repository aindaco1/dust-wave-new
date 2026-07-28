import {
  createRssImportActivationApprovalController
} from "./podcast-admin-rss-activation-approval.js";

export function createRssImportCutoverController({
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
}) {
  const activationApproval =
    createRssImportActivationApprovalController({
      client,
      text,
      isSuperAdmin,
      friendlyError,
      setStatus,
      statusRoot,
      confirmationCheckbox,
      callout
    });
  return { render };

  function render(plan, boundary, state, onPayload) {
    const cutover = state.cutoverReadiness || {};
    const root = document.createElement("section");
    root.className =
      "podcast-admin__rss-import-cutover "
      + "podcast-admin__readiness-card";
    const heading = document.createElement("h6");
    heading.textContent = text("rssImportCutoverHeading");
    const intro = document.createElement("p");
    intro.textContent = text("rssImportCutoverIntro");
    const summary = document.createElement("p");
    summary.textContent = text("rssImportCutoverSummary", {
      publicEpisodes: formatInteger(cutover.publicEpisodeCount),
      totalEpisodes: formatInteger(cutover.importedEpisodeCount),
      reobserved: formatInteger(cutover.reobservedDestinationCount),
      required: formatInteger(cutover.requiredDestinationCount)
    });
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("rssImportCutoverDigest"),
      cutover.evidenceSha256
    );
    appendEvidence(
      evidence,
      text("rssImportCutoverFeedDigest"),
      cutover.feedValidationEvidenceSha256
    );
    appendEvidence(
      evidence,
      text("rssImportCutoverDirectoryDigest"),
      cutover.directoryEvidenceSha256
    );
    const checks = document.createElement("ul");
    checks.className = "podcast-admin__rss-import-checks";
    const values = cutover.checks || {};
    checks.append(
      checkItem(
        "rssImportCutoverReconciliation",
        values.ownerReconciliationApproved
      ),
      checkItem(
        "rssImportCutoverEpisodes",
        values.importedEpisodeRevisionsPublished
      ),
      checkItem(
        "rssImportCutoverFeed",
        values.canonicalFeedCurrent
      ),
      checkItem(
        "rssImportCutoverCertification",
        values.directoryCertificationReady
      ),
      checkItem(
        "rssImportCutoverReobservation",
        values.directoriesReobservedAfterFeed
      ),
      checkItem(
        "rssImportCutoverAttestation",
        values.ownerRedirectAttested
      )
    );
    root.append(heading, intro, summary, evidence, checks);
    const items = document.createElement("div");
    items.className = "podcast-admin__rss-import-reconciliation-items";
    for (const item of Array.isArray(cutover.items)
      ? cutover.items
      : []) {
      items.append(renderItem(item));
    }
    root.append(items);
    if (cutover.packet) root.append(renderPacket(cutover.packet));
    root.append(
      activationApproval.render(plan, boundary, state, onPayload)
    );
    appendBlockers(root, cutover.blockers);
    if (cutover.readyForPacket && isSuperAdmin()) {
      root.append(renderForm(plan, boundary, state, onPayload));
    }
    root.append(callout("rssImportCutoverNoActivation"));
    return root;
  }

  function renderItem(item) {
    const card = document.createElement("article");
    card.className = `podcast-admin__readiness-card ${
      item.public && item.rssPublished && item.newsPublished
        ? "is-ready"
        : "is-missing"
    }`;
    const title = document.createElement("h6");
    title.textContent = String(
      item.slug || item.episodeId || text("notAvailable")
    );
    const revision = document.createElement("p");
    revision.textContent = text("rssImportCutoverEpisodeRevision", {
      revision: formatInteger(item.publicationRevision)
    });
    const checks = document.createElement("ul");
    checks.className = "podcast-admin__rss-import-checks";
    checks.append(
      checkItem("rssImportCutoverEpisodePublic", item.public),
      checkItem("rssImportCutoverEpisodeRss", item.rssPublished),
      checkItem("rssImportCutoverEpisodeNews", item.newsPublished)
    );
    card.append(title, revision, checks);
    appendBlockers(card, item.blockers);
    return card;
  }

  function renderPacket(packetState) {
    const packet = document.createElement("div");
    packet.className = "podcast-admin__callout";
    const heading = document.createElement("strong");
    heading.textContent = packetState.fresh
      ? text("rssImportCutoverPacketCurrent")
      : text("rssImportCutoverPacketStale");
    const evidence = document.createElement("p");
    evidence.textContent = text("rssImportCutoverPacketEvidence", {
      id: packetState.id,
      digest: packetState.evidenceSha256
    });
    packet.append(heading, evidence);
    return packet;
  }

  function renderForm(plan, boundary, state, onPayload) {
    const form = document.createElement("form");
    form.className = "podcast-admin__form";
    form.dataset.podcastRssImportCutoverForm = "";
    const ownerReview = confirmationCheckbox(
      "ownerReviewConfirmed",
      "rssImportCutoverOwnerReview"
    );
    const noActivation = confirmationCheckbox(
      "noActivationConfirmed",
      "rssImportCutoverNoActivationConfirmation"
    );
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("rssImportCutoverPrepare");
    form.append(ownerReview, noActivation, button);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!globalThis.confirm(
        text("rssImportCutoverFinalConfirmation")
      )) {
        return;
      }
      button.disabled = true;
      setStatus(statusRoot, text("rssImportCutoverPreparing"));
      try {
        const payload = await client.request(
          `/v1/admin/rss-import/plans/${
            encodeURIComponent(plan.id)
          }/cutover-packet`,
          {
            method: "POST",
            body: {
              packetId: newCutoverPacketId(),
              expectedEvidenceSha256:
                state.cutoverReadiness.evidenceSha256,
              ownerReviewConfirmed: true,
              noActivationConfirmed: true
            }
          }
        );
        onPayload(payload, boundary);
        setStatus(statusRoot, text("rssImportCutoverComplete"));
      } catch (error) {
        setStatus(statusRoot, friendlyError(error), true);
        button.disabled = false;
      }
    });
    return form;
  }

  function newCutoverPacketId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_cutover_packet_${suffix}`;
  }

}
