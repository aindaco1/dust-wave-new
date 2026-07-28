const DELIVERY_AUDIO_WORKFLOW = "process-delivery-audio.yml";

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
  let requestId = 0;
  let state = null;

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
    if (productionPanel && !productionPanel.hidden) {
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
    if (
      !episodeId
      || !currentMaster?.id
      || !state?.delivery?.processor?.available
      || !canQueue()
    ) return;
    queueButton.disabled = true;
    setStatus(status, text("deliveryAudioQueuing"));
    try {
      const jobId = operationId("delivery_audio");
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
      setStatus(status, text("deliveryAudioQueued", {
        id: String(response.job?.id || jobId),
        workflow: String(
          response.processor?.workflow || DELIVERY_AUDIO_WORKFLOW
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
    const activeCurrent = jobs.some((job) =>
      job.current
      && ["queued", "rendering", "completing", "ready", "approved"].includes(
        String(job.status)
      )
    );
    summary.textContent = currentMaster
      ? text("deliveryAudioMasterReady", {
          revision: formatInteger(currentMaster.revision),
          profile: String(
            state.delivery?.safeguards?.normalizedStreamProfile || ""
          )
        })
      : text("deliveryAudioMasterRequired");
    queueButton.disabled = !(
      currentMaster
      && processorAvailable
      && canQueue()
      && !activeCurrent
    );
    results.replaceChildren(
      ...(jobs.length
        ? jobs.map(renderJob)
        : [emptyMessage(text("deliveryAudioNone"))])
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
        workflow: DELIVERY_AUDIO_WORKFLOW,
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
      heading,
      intro,
      reasonLabel,
      acknowledgeLabel,
      button,
      formStatus
    );
    form.addEventListener("submit", (event) =>
      approve(event, job, form, formStatus)
    );
    return form;
  }

  async function approve(event, job, form, formStatus) {
    event.preventDefault();
    const currentMaster = state?.master?.current;
    if (
      !job?.id
      || !job.approval?.eligible
      || !currentMaster?.id
      || !canApprove()
    ) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(formStatus, text("approvingDeliveryAudio"));
    try {
      await client.request(
        `/v1/admin/delivery-audio-jobs/${
          encodeURIComponent(String(job.id))
        }/approve`,
        {
          method: "POST",
          body: {
            workingMasterId: currentMaster.id,
            approvalReason: form.elements.approvalReason.value
          }
        }
      );
      await onApproved(select?.value || "");
      setStatus(status, text("deliveryAudioApproved"));
    } catch (error) {
      setStatus(formStatus, friendlyError(error), true);
    } finally {
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
      releasePlayers();
      results?.replaceChildren();
      if (summary) summary.textContent = "";
      if (queueButton) queueButton.disabled = true;
      setStatus(status, "");
    }
  };
}

function appendEvidenceRow(root, label, value) {
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
  if (["ready", "approved"].includes(status)) return "ready";
  if (["failed", "stale"].includes(status)) return "failed";
  return "pending";
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString();
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ");
}
