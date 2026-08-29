import { buildDeliveryAudioApprovalRequest } from "./podcast-admin-delivery-audio-approval.js";
import {
  canQueueCurrentOperation,
  createRetriableOperationId
} from "./podcast-admin-retriable-operation.js";
import {
  formatBytes,
  formatInteger
} from "./podcast-admin-formatters.js";
import {
  appendDefinition,
  createEmptyAdminMessage
} from "./podcast-admin-dom.js";

const WORKFLOW_NAME = "process-delivery-audio.yml";
const ACTIVE_STATUSES = new Set(
  ["queued", "rendering", "completing", "ready", "approved"]
);

export function mountDeliveryAudio({
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
  onApproved
}) {
  const select = root.querySelector("[data-podcast-delivery-audio-episode]");
  const refreshButton = root.querySelector(
    "[data-podcast-delivery-audio-refresh]"
  );
  const queueButton = root.querySelector("[data-podcast-delivery-audio-queue]");
  const summary = root.querySelector("[data-podcast-delivery-audio-summary]");
  const results = root.querySelector("[data-podcast-delivery-audio-results]");
  const status = root.querySelector("[data-podcast-delivery-audio-status]");
  const productionPanel = root.querySelector("#podcast-panel-production");
  const episodePanel = root.querySelector("#podcast-panel-episodes");
  const productionGroup = productionPanel?.closest(
    "[data-podcast-workspace-group]"
  );
  let requestId = 0;
  let state = null;
  const queueOperation = createRetriableOperationId(
    operationId,
    "delivery_audio"
  );

  select?.addEventListener("change", refresh);
  refreshButton?.addEventListener("click", refresh);
  queueButton?.addEventListener("click", queue);

  function setEpisodes(episodes) {
    if (!select) return;
    const previous = select.value;
    select.replaceChildren(
      ...episodes.map((episode) =>
        new Option(
          `${episode.title} — ${episode.mediaStatus}`,
          episode.id,
          false,
          episode.id === previous
        )
      )
    );
    state = null;
    releasePlayers();
    results?.replaceChildren();
    if (!episodes.length) {
      summary.textContent = text("deliveryAudioCreateEpisode");
      queueButton.disabled = true;
      setStatus(status, "");
      return;
    }
    if (
      productionPanel
      && productionGroup?.open
      && episodePanel
      && !episodePanel.hidden
    ) {
      refresh();
    } else {
      summary.textContent = text("deliveryAudioChooseEpisode");
      queueButton.disabled = true;
    }
  }

  async function refresh() {
    const episodeId = select?.value || "";
    const currentRequest = ++requestId;
    state = null;
    releasePlayers();
    results?.replaceChildren();
    if (!episodeId) {
      summary.textContent = text("deliveryAudioChooseEpisode");
      queueButton.disabled = true;
      return;
    }
    refreshButton.disabled = true;
    queueButton.disabled = true;
    summary.textContent = text("deliveryAudioLoading");
    setStatus(status, "");
    try {
      const [master, delivery] = await Promise.all([
        client.request(
          `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-master`
        ),
        client.request(
          `/v1/admin/episodes/${encodeURIComponent(
            episodeId
          )}/delivery-audio-jobs`
        )
      ]);
      if (currentRequest !== requestId) return;
      state = { master, delivery };
      render();
    } catch (error) {
      if (currentRequest !== requestId) return;
      summary.textContent = text("deliveryAudioLoadFailed");
      setStatus(status, friendlyError(error), true);
    } finally {
      if (currentRequest === requestId) refreshButton.disabled = false;
    }
  }

  async function queue() {
    const episodeId = select?.value || "";
    const currentMaster = state?.master?.current;
    const jobs = Array.isArray(state?.delivery?.jobs)
      ? state.delivery.jobs
      : [];
    if (
      !episodeId
      || !canQueueCurrentOperation({
        currentId: currentMaster?.id,
        processorEnabled: state?.delivery?.processor?.available,
        authorized: canQueue(),
        rows: jobs,
        activeStatuses: ACTIVE_STATUSES
      })
    ) return;
    queueButton.disabled = true;
    setStatus(status, text("deliveryAudioQueuing"));
    const operationContext = `${episodeId}:${currentMaster.id}`;
    try {
      const jobId = queueOperation.get(operationContext);
      const response = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/delivery-audio-jobs`,
        {
          method: "POST",
          body: {
            jobId,
            workingMasterId: currentMaster.id
          }
        }
      );
      queueOperation.accept(operationContext, jobId);
      setStatus(status, text("deliveryAudioQueued", {
        id: String(response.job?.id || jobId),
        workflow: String(
          response.processor?.workflow || WORKFLOW_NAME
        )
      }));
      await refresh();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      render();
    } finally {
      if (state) {
        render();
      } else {
        queueButton.disabled = false;
      }
    }
  }

  function render() {
    if (!state || !summary || !results || !queueButton) return;
    const currentMaster = state.master?.current;
    const processorAvailable = Boolean(
      state.delivery?.processor?.available
    );
    const jobs = Array.isArray(state.delivery?.jobs)
      ? state.delivery.jobs
      : [];
    summary.textContent = currentMaster
      ? text("deliveryAudioMasterReady", {
          revision: formatInteger(currentMaster.revision),
          profile: String(
            state.delivery?.safeguards?.normalizedStreamProfile || ""
          )
        })
      : text("deliveryAudioMasterRequired");
    queueButton.disabled = !canQueueCurrentOperation({
      currentId: currentMaster?.id,
      processorEnabled: processorAvailable,
      authorized: canQueue(),
      rows: jobs,
      activeStatuses: ACTIVE_STATUSES
    });
    results.replaceChildren(
      ...(jobs.length
        ? jobs.map(renderJob)
        : [createEmptyAdminMessage(text("deliveryAudioNone"))])
    );
    window.DWDigestAudio?.mount(results);
  }

  function renderJob(job) {
    const jobStatus = String(job.status || "queued");
    const article = document.createElement("article");
    article.className =
      `podcast-admin__readiness-card is-${cardStatus(jobStatus)}`;
    const heading = document.createElement("div");
    heading.className = "podcast-admin__readiness-card-heading";
    const title = document.createElement("h3");
    title.textContent = text("deliveryAudioJob", {
      id: String(job.id || "")
    });
    const pill = document.createElement("span");
    pill.className = "podcast-admin__pill";
    pill.textContent = localizeCode("jobStatus", jobStatus);
    heading.append(title, pill);
    const summaryLine = document.createElement("p");
    summaryLine.textContent = [
      String(job.streamProfile || ""),
      job.current
        ? text("currentSourceEvidence")
        : text("staleSourceEvidence"),
      job.output?.bytes ? formatBytes(job.output.bytes) : text("renderPending")
    ].join(" · ");
    article.append(heading, summaryLine);
    if (job.output?.mediaPath && job.peaks?.path) {
      article.append(buildPlayer(
        `${String(job.id)}_delivery`,
        text("deliveryAudioPlayer"),
        String(job.output.mediaPath),
        {
          contract: "deliveryAudio",
          peaksPath: String(job.peaks.path)
        }
      ));
    }
    appendEvidence(article, job);
    appendProgress(article, job, jobStatus);
    if (job.approval?.eligible && canApprove() && jobStatus === "ready") {
      article.append(buildApprovalForm(job));
    }
    return article;
  }

  function appendEvidence(article, job) {
    if (!job.output && !job.peaks) return;
    const evidence = document.createElement("dl");
    evidence.className = "podcast-admin__readiness-evidence";
    appendEvidenceRow(
      evidence,
      text("deliveryAudioSha256"),
      String(job.output?.sha256 || "")
    );
    appendEvidenceRow(
      evidence,
      text("deliveryPeaksEvidence"),
      job.peaks
        ? `${String(job.peaks.sha256 || "")} · ${
          formatInteger(job.peaks.length)
        }`
        : ""
    );
    appendEvidenceRow(
      evidence,
      text("deliveryProcessorReport"),
      String(job.processor?.reportSha256 || "")
    );
    article.append(evidence);
  }

  function appendProgress(article, job, jobStatus) {
    const detail = document.createElement("p");
    if (["queued", "rendering", "completing"].includes(jobStatus)) {
      detail.textContent = text("deliveryAudioRunWorkflow", {
        workflow: WORKFLOW_NAME,
        id: String(job.id || "")
      });
    } else if (jobStatus === "failed") {
      detail.textContent = text("processorFailedSafely", {
        code: humanize(job.failureCode || "processor_failed")
      });
    } else if (jobStatus === "stale") {
      detail.textContent = text("deliveryAudioStale");
    } else if (jobStatus === "approved") {
      detail.textContent = job.approval?.approvedCurrent
        ? text("deliveryAudioApprovedCurrent")
        : text("deliveryAudioApprovedReplaced");
    } else {
      return;
    }
    article.append(detail);
  }

  function buildApprovalForm(job) {
    const form = document.createElement("form");
    form.className =
      "podcast-admin__form podcast-admin__audio-master-approval";
    const heading = document.createElement("h4");
    heading.textContent = text("approveDeliveryAudioHeading");
    const intro = document.createElement("p");
    intro.textContent = text("approveDeliveryAudioIntro");
    const reasonLabel = document.createElement("label");
    reasonLabel.textContent = text("approvalReason");
    const reason = document.createElement("textarea");
    reason.name = "approvalReason";
    reason.rows = 3;
    reason.minLength = 10;
    reason.maxLength = 500;
    reason.required = true;
    reasonLabel.append(reason);
    const acknowledgeLabel = document.createElement("label");
    acknowledgeLabel.className = "podcast-admin__checkbox";
    const acknowledge = document.createElement("input");
    acknowledge.type = "checkbox";
    acknowledge.name = "acknowledgeExactDeliveryAudio";
    acknowledge.required = true;
    acknowledgeLabel.append(
      acknowledge,
      document.createTextNode(` ${text("exactDeliveryAudioAck")}`)
    );
    const button = document.createElement("button");
    button.className = "btn btn-danger";
    button.type = "submit";
    button.textContent = text("approveDeliveryAudio");
    const formStatus = document.createElement("p");
    formStatus.className = "podcast-admin__status";
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.append(
      heading, intro, reasonLabel, acknowledgeLabel, button, formStatus
    );
    form.addEventListener("submit", (event) =>
      approve(event, job, form, formStatus)
    );
    return form;
  }

  async function approve(event, job, form, formStatus) {
    event.preventDefault();
    if (!canApprove()) return;
    if (form.reportValidity && !form.reportValidity()) return;
    const request = buildDeliveryAudioApprovalRequest({
      job,
      selectedEpisodeId: select?.value,
      currentMasterId: state?.master?.current?.id,
      approvalReason: form.elements.approvalReason.value,
      acknowledged:
        form.elements.acknowledgeExactDeliveryAudio?.checked === true
    });
    if (!request) {
      setStatus(formStatus, text("deliveryAudioApprovalInvalid"), true);
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    setStatus(formStatus, text("approvingDeliveryAudio"));
    try {
      await client.request(request.path, request.options);
      setStatus(status, text("deliveryAudioApproved"));
      try {
        await onApproved(select?.value || "");
      } catch {
        setStatus(formStatus, text("deliveryAudioApprovalRefreshFailed"), true);
      }
    } catch (error) {
      setStatus(formStatus, friendlyError(error), true);
      button.disabled = false;
    }
  }

  function releasePlayers() {
    for (const card of results?.querySelectorAll(".audio-card") || []) {
      const media = card.querySelector("audio");
      try { media?.pause(); } catch {}
      try { card._ws?.destroy?.(); } catch {}
      const wave = card.querySelector(".wave");
      try { wave?.__wsRO?.disconnect?.(); } catch {}
    }
  }

  return {
    setEpisodes,
    refresh,
    reset() {
      requestId += 1;
      state = null;
      queueOperation.reset();
      releasePlayers();
      results?.replaceChildren();
      if (summary) summary.textContent = "";
      if (queueButton) queueButton.disabled = true;
      setStatus(status, "");
    }
  };
}

function appendEvidenceRow(root, label, value) {
  appendDefinition(root, label, value || "—");
}

function cardStatus(status) {
  if (["ready", "approved"].includes(status)) return "ready";
  if (["failed", "stale"].includes(status)) return "failed";
  return "pending";
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ");
}
