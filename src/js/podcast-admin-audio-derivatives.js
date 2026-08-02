import {
  formatBytes,
  formatInteger
} from "./podcast-admin-formatters.js";

const DERIVATIVE_WORKFLOW =
  "process-audio-enhancement-derivative.yml";

export function mountAudioEnhancementDerivatives({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  operationId,
  buildPlayer,
  localizeCode,
  canQueue,
  canApprove,
  onDecided
}) {
  const statusRoot = root.querySelector(
    "[data-podcast-audio-derivative-status]"
  );
  const resultsRoot = root.querySelector(
    "[data-podcast-audio-derivative-results]"
  );
  let state = null;
  let episodeId = "";
  let baseRevision = 0;
  let requestId = 0;

  async function load(nextEpisodeId, nextBaseRevision) {
    const currentRequest = ++requestId;
    episodeId = String(nextEpisodeId || "");
    baseRevision = Math.max(0, Number(nextBaseRevision) || 0);
    state = null;
    releasePlayers();
    resultsRoot?.replaceChildren();
    setStatus(statusRoot, "");
    if (!episodeId) return;
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/`
          + "audio-enhancement-derivatives"
      );
      if (currentRequest !== requestId) return;
      state = payload;
      render();
    } catch (error) {
      if (currentRequest !== requestId) return;
      setStatus(statusRoot, friendlyError(error), true);
    }
  }

  function queueButtonForPreview(preview) {
    if (
      preview?.status !== "ready"
      || !preview?.id
      || !state?.processor?.available
      || !canQueue()
    ) return null;
    const button = document.createElement("button");
    button.className = "btn btn-outline-light";
    button.type = "button";
    button.textContent = text("queueFullDerivative");
    button.addEventListener("click", () => queue(preview, button));
    return button;
  }

  async function queue(preview, button) {
    if (
      !episodeId
      || !preview?.id
      || !state?.processor?.available
      || !canQueue()
    ) return;
    button.disabled = true;
    setStatus(statusRoot, text("snapshottingDerivative"));
    try {
      const jobId = operationId("derivative");
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(episodeId)}/`
          + "audio-enhancement-derivatives",
        {
          method: "POST",
          body: {
            jobId,
            previewId: String(preview.id)
          }
        }
      );
      await load(episodeId, baseRevision);
      setStatus(statusRoot, text("derivativeQueued", {
        id: String(payload.derivative?.id || jobId),
        workflow: String(
          payload.processor?.workflow || DERIVATIVE_WORKFLOW
        )
      }));
    } catch (error) {
      setStatus(statusRoot, friendlyError(error), true);
      render();
    } finally {
      button.disabled = false;
    }
  }

  function render() {
    if (!resultsRoot) return;
    releasePlayers();
    const derivatives = Array.isArray(state?.derivatives)
      ? state.derivatives
      : [];
    resultsRoot.replaceChildren(
      ...(derivatives.length
        ? derivatives.map(renderDerivative)
        : [emptyMessage(text("noFullDerivatives"))])
    );
    window.DWDigestAudio?.mount(resultsRoot);
  }

  function renderDerivative(derivative) {
    const article = document.createElement("article");
    const derivativeStatus = String(derivative.status || "queued");
    article.className =
      `podcast-admin__readiness-card is-${cardStatus(
        derivativeStatus
      )}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = text("fullDerivative", {
      id: String(derivative.id || "")
    });
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = localizeCode("jobStatus", derivativeStatus);
    heading.append(title, pill);
    const recipe = derivative.recipe || {};
    const summary = document.createElement("p");
    summary.textContent = [
      localizeCode("audioPreset", recipe.presetId || "preset"),
      derivative.current
        ? text("currentSourceEvidence")
        : text("staleSourceEvidence"),
      derivative.output?.objectBytes
        ? formatBytes(derivative.output.objectBytes)
        : text("renderPending")
    ].join(" · ");
    article.append(heading, summary);
    if (
      [
        "ready",
        "quality_control_failed",
        "approved"
      ].includes(derivativeStatus)
      && derivative.output?.mediaUrl
    ) {
      article.append(buildPlayer(
        `${String(derivative.id)}_full`,
        text("fullEnhancedEpisode"),
        String(derivative.output.mediaUrl)
      ));
    }
    appendQualityControl(article, derivative);
    appendStateDetail(article, derivative, derivativeStatus);
    if (
      (derivative.approvable || derivative.rejectable)
      && canApprove()
      && derivativeStatus === "ready"
    ) {
      const decisions = document.createElement("div");
      decisions.className =
        "podcast-admin__audio-derivative-decisions";
      if (derivative.approvable) {
        decisions.append(buildApprovalForm(derivative));
      }
      if (derivative.rejectable) {
        decisions.append(buildRejectionForm(derivative));
      }
      article.append(decisions);
    }
    return article;
  }

  function appendQualityControl(article, derivative) {
    const qc = derivative.qualityControl;
    if (!qc) return;
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidence(
      evidence,
      text("derivativeQcStatus"),
      [
        localizeCode("jobStatus", qc.status || "queued"),
        text("policyShort", {
          revision: formatInteger(qc.policyRevision)
        }),
        qc.outputDigestMatches
          ? text("rendererQcDigestMatch")
          : text("rendererQcDigestPending")
      ].join(" · ")
    );
    appendEvidence(
      evidence,
      text("sourceSha256"),
      String(derivative.output?.sha256 || "")
    );
    appendEvidence(
      evidence,
      text("qcReportSha256"),
      String(qc.reportSha256 || "")
    );
    article.append(evidence);
  }

  function appendStateDetail(article, derivative, derivativeStatus) {
    const detail = document.createElement("p");
    if (derivative.processor?.workflow) {
      detail.textContent = text("runDerivativeWorkflow", {
        workflow: String(derivative.processor.workflow),
        id: String(
          derivative.processor.runId || derivative.id || ""
        )
      });
    } else if (
      ["queued", "rendering", "completing"].includes(derivativeStatus)
    ) {
      detail.textContent = text("waitingForStagingWorkflow");
    } else if (derivativeStatus === "failed") {
      detail.textContent = text("processorFailedSafely", {
        code: humanize(derivative.failureCode || "processor_failed")
      });
    } else if (derivativeStatus === "quality_control_failed") {
      detail.textContent = text("derivativeQcFailed");
    } else if (derivativeStatus === "stale") {
      detail.textContent = text("derivativeStale");
    } else if (derivativeStatus === "rejected") {
      detail.textContent = text("derivativeRejected", {
        reason: String(derivative.rejectionReason || "")
      });
    } else {
      return;
    }
    article.append(detail);
  }

  function buildApprovalForm(derivative) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__form podcast-admin__audio-master-approval";
    const heading = document.createElement("h4");
    heading.textContent = text("approveDerivativeHeading");
    const intro = document.createElement("p");
    intro.textContent = text("approveDerivativeIntro");
    const reasonLabel = document.createElement("label");
    reasonLabel.textContent = text("approvalReason");
    const reason = document.createElement("textarea");
    reason.name = "approvalReason";
    reason.rows = 3;
    reason.maxLength = 500;
    reason.required = true;
    reasonLabel.append(reason);
    const acknowledgeLabel = document.createElement("label");
    acknowledgeLabel.className = "podcast-admin__checkbox";
    const acknowledge = document.createElement("input");
    acknowledge.type = "checkbox";
    acknowledge.required = true;
    acknowledgeLabel.append(
      acknowledge,
      document.createTextNode(` ${text("exactDerivativeAck")}`)
    );
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("approveEnhancedMaster");
    const formStatus = document.createElement("p");
    formStatus.className = "podcast-admin__status";
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.append(
      heading,
      intro,
      reasonLabel,
      acknowledgeLabel,
      button,
      formStatus
    );
    form.addEventListener("submit", (event) =>
      approve(event, derivative, form, formStatus)
    );
    return form;
  }

  function buildRejectionForm(derivative) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__form podcast-admin__audio-master-rejection";
    const heading = document.createElement("h4");
    heading.textContent = text("rejectDerivativeHeading");
    const intro = document.createElement("p");
    intro.textContent = text("rejectDerivativeIntro");
    const reasonLabel = document.createElement("label");
    reasonLabel.textContent = text("rejectionReason");
    const reason = document.createElement("textarea");
    reason.name = "rejectionReason";
    reason.rows = 3;
    reason.minLength = 10;
    reason.maxLength = 500;
    reason.required = true;
    reasonLabel.append(reason);
    const acknowledgeLabel = document.createElement("label");
    acknowledgeLabel.className = "podcast-admin__checkbox";
    const acknowledge = document.createElement("input");
    acknowledge.type = "checkbox";
    acknowledge.name = "acknowledgeExactDerivative";
    acknowledge.required = true;
    acknowledgeLabel.append(
      acknowledge,
      document.createTextNode(` ${text("rejectDerivativeAck")}`)
    );
    const button = document.createElement("button");
    button.className = "btn btn-outline-light";
    button.type = "submit";
    button.textContent = text("rejectEnhancedCandidate");
    const formStatus = document.createElement("p");
    formStatus.className = "podcast-admin__status";
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.append(
      heading,
      intro,
      reasonLabel,
      acknowledgeLabel,
      button,
      formStatus
    );
    form.addEventListener("submit", (event) =>
      reject(event, derivative, form, formStatus)
    );
    return form;
  }

  async function approve(event, derivative, form, formStatus) {
    event.preventDefault();
    if (
      !episodeId
      || !derivative?.id
      || !derivative.approvable
      || !canApprove()
    ) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(formStatus, text("approvingEnhancedMaster"));
    try {
      const payload = await client.request(
        `/v1/admin/audio-enhancement-derivatives/`
          + `${encodeURIComponent(String(derivative.id))}/approve`,
        {
          method: "POST",
          body: {
            masterId: operationId("master"),
            baseRevision,
            approvalReason: form.elements.approvalReason.value
          }
        }
      );
      await onDecided(episodeId);
      setStatus(statusRoot, text("enhancedMasterApproved", {
        revision: formatInteger(payload.master?.revision)
      }));
    } catch (error) {
      setStatus(formStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  async function reject(event, derivative, form, formStatus) {
    event.preventDefault();
    if (
      !episodeId
      || !derivative?.id
      || !derivative.rejectable
      || !canApprove()
    ) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(formStatus, text("rejectingEnhancedCandidate"));
    try {
      await client.request(
        `/v1/admin/audio-enhancement-derivatives/`
          + `${encodeURIComponent(String(derivative.id))}/reject`,
        {
          method: "POST",
          body: {
            baseRevision,
            rejectionReason: form.elements.rejectionReason.value,
            acknowledgeExactDerivative:
              form.elements.acknowledgeExactDerivative.checked
          }
        }
      );
      await onDecided(episodeId);
      setStatus(statusRoot, text("enhancedCandidateRejected"));
    } catch (error) {
      setStatus(formStatus, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  function releasePlayers() {
    for (const card of resultsRoot?.querySelectorAll(".audio-card") || []) {
      const media = card.querySelector("audio");
      try { media?.pause(); } catch {}
      try { card._ws?.destroy?.(); } catch {}
      const wave = card.querySelector(".wave");
      try { wave?.__wsRO?.disconnect?.(); } catch {}
    }
  }

  return {
    load,
    queueButtonForPreview,
    releasePlayers,
    reset() {
      requestId += 1;
      state = null;
      episodeId = "";
      baseRevision = 0;
      releasePlayers();
      resultsRoot?.replaceChildren();
      setStatus(statusRoot, "");
    }
  };
}

function appendEvidence(root, label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value || "—";
  root.append(term, description);
}

function emptyMessage(value) {
  const message = document.createElement("p");
  message.className = "podcast-admin__empty";
  message.textContent = value;
  return message;
}

function cardStatus(status) {
  if (["succeeded", "ready", "approved"].includes(status)) return "ready";
  if (
    [
      "failed",
      "quality_control_failed",
      "rejected",
      "stale"
    ].includes(status)
  ) return "failed";
  return "pending";
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ");
}
