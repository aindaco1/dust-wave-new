export function createRssImportActivationApprovalController({
  client,
  text,
  isSuperAdmin,
  friendlyError,
  setStatus,
  statusRoot,
  confirmationCheckbox,
  callout
}) {
  return { render };

  function render(plan, boundary, state, onPayload) {
    const fragment = document.createDocumentFragment();
    const checklist = state.oldHostRedirectChecklist || {};
    const packet = state.cutoverReadiness?.packet;
    if (checklist.activationApproval) {
      fragment.append(renderApproval(checklist.activationApproval));
    }
    if (
      checklist.readyForActivationApproval
      && packet?.fresh
      && isSuperAdmin()
    ) {
      fragment.append(renderForm(
        plan,
        boundary,
        state,
        onPayload
      ));
    }
    return fragment;
  }

  function renderApproval(approval) {
    const card = document.createElement("div");
    card.className = "podcast-admin__callout";
    const heading = document.createElement("strong");
    heading.textContent = approval.fresh
      ? text("rssImportActivationApprovalCurrent")
      : text("rssImportActivationApprovalStale");
    const evidence = document.createElement("p");
    evidence.textContent = text(
      "rssImportActivationApprovalEvidence",
      {
        id: approval.id,
        packetId: approval.cutoverPacketId,
        method: text(
          `rssImportRedirectMethod_${approval.redirectMethod}`,
          String(approval.redirectMethod || "").replaceAll("_", " ")
        )
      }
    );
    card.append(heading, evidence);
    return card;
  }

  function renderForm(plan, boundary, state, onPayload) {
    const form = document.createElement("form");
    form.className = "podcast-admin__form";
    form.dataset.podcastRssImportActivationApprovalForm = "";
    const finalReview = confirmationCheckbox(
      "finalReviewConfirmed",
      "rssImportActivationApprovalFinalReview"
    );
    const manualAction = confirmationCheckbox(
      "manualActionAcknowledged",
      "rssImportActivationApprovalManualAction"
    );
    const rollback = confirmationCheckbox(
      "rollbackPlanConfirmed",
      "rssImportActivationApprovalRollback"
    );
    const noActivation = confirmationCheckbox(
      "noActivationPerformedConfirmed",
      "rssImportActivationApprovalNoActivation"
    );
    const notice = callout("rssImportActivationApprovalBoundary");
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("rssImportActivationApprovalSubmit");
    form.append(
      finalReview,
      manualAction,
      rollback,
      noActivation,
      notice,
      button
    );
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (!globalThis.confirm(
        text("rssImportActivationApprovalFinalConfirmation")
      )) {
        return;
      }
      button.disabled = true;
      setStatus(
        statusRoot,
        text("rssImportActivationApprovalSaving")
      );
      try {
        const payload = await client.request(
          `/v1/admin/rss-import/plans/${
            encodeURIComponent(plan.id)
          }/redirect-activation-approval`,
          {
            method: "POST",
            body: {
              approvalId: newApprovalId(),
              expectedPacketId:
                state.cutoverReadiness.packet.id,
              expectedEvidenceSha256:
                state.cutoverReadiness.packet.evidenceSha256,
              finalReviewConfirmed: true,
              manualActionAcknowledged: true,
              rollbackPlanConfirmed: true,
              noActivationPerformedConfirmed: true
            }
          }
        );
        onPayload(payload, boundary);
        setStatus(
          statusRoot,
          text("rssImportActivationApprovalComplete")
        );
      } catch (error) {
        setStatus(statusRoot, friendlyError(error), true);
        button.disabled = false;
      }
    });
    return form;
  }

  function newApprovalId() {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replaceAll("-", "_")
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `rss_redirect_activation_approval_${suffix}`;
  }
}
