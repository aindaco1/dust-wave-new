import {
  canQueueCurrentOperation,
  createRetriableOperationId
} from "./podcast-admin-retriable-operation.js";
import {
  formatBytes,
  formatInteger
} from "./podcast-admin-formatters.js";

const WORKFLOW_NAME = "process-youtube-audio-rendition.yml";
const ACTIVE_RENDITION_STATUSES = new Set([
  "queued",
  "rendering",
  "completing",
  "ready"
]);

export function mountYouTubeAudioRenditions({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  operationId,
  canQueue
}) {
  const select = root.querySelector(
    "[data-podcast-youtube-audio-episode]"
  );
  const refreshButton = root.querySelector(
    "[data-podcast-youtube-audio-refresh]"
  );
  const queueButton = root.querySelector(
    "[data-podcast-youtube-audio-queue]"
  );
  const summary = root.querySelector(
    "[data-podcast-youtube-audio-summary]"
  );
  const results = root.querySelector(
    "[data-podcast-youtube-audio-results]"
  );
  const status = root.querySelector(
    "[data-podcast-youtube-audio-status]"
  );
  const productionPanel = root.querySelector("#podcast-panel-production");
  const episodePanel = root.querySelector("#podcast-panel-episodes");
  const productionGroup = productionPanel?.closest(
    "[data-podcast-workspace-group]"
  );
  let requestId = 0;
  let state = null;
  const queueOperation = createRetriableOperationId(
    operationId,
    "youtube_rendition"
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
    results?.replaceChildren();
    if (!episodes.length) {
      summary.textContent = text("youtubeAudioCreateEpisode");
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
      summary.textContent = text("youtubeAudioChooseEpisode");
      queueButton.disabled = true;
    }
  }

  async function refresh() {
    const episodeId = select?.value || "";
    const currentRequest = ++requestId;
    state = null;
    results?.replaceChildren();
    if (!episodeId) {
      summary.textContent = text("youtubeAudioChooseEpisode");
      if (queueButton) queueButton.disabled = true;
      return;
    }
    if (refreshButton) refreshButton.disabled = true;
    if (queueButton) queueButton.disabled = true;
    summary.textContent = text("youtubeAudioLoading");
    setStatus(status, "");
    try {
      const [master, renditions] = await Promise.all([
        client.request(
          `/v1/admin/episodes/${encodeURIComponent(episodeId)}/audio-master`
        ),
        client.request(
          `/v1/admin/episodes/${encodeURIComponent(
            episodeId
          )}/youtube-audio-renditions`
        )
      ]);
      if (currentRequest !== requestId) return;
      state = { master, renditions };
      render();
    } catch (error) {
      if (currentRequest !== requestId) return;
      summary.textContent = text("youtubeAudioLoadFailed");
      setStatus(status, friendlyError(error), true);
    } finally {
      if (currentRequest === requestId && refreshButton) {
        refreshButton.disabled = false;
      }
    }
  }

  async function queue() {
    const episodeId = select?.value || "";
    const currentMaster = state?.master?.current;
    const rows = Array.isArray(state?.renditions?.renditions)
      ? state.renditions.renditions
      : [];
    if (
      !episodeId
      || !canQueueCurrentOperation({
        currentId: currentMaster?.id,
        processorEnabled: state?.renditions?.processorEnabled,
        authorized: canQueue(),
        rows,
        activeStatuses: ACTIVE_RENDITION_STATUSES
      })
    ) return;
    queueButton.disabled = true;
    setStatus(status, text("youtubeAudioQueuing"));
    const operationContext = `${episodeId}:${currentMaster.id}`;
    try {
      const renditionId = queueOperation.get(operationContext);
      const response = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          episodeId
        )}/youtube-audio-renditions`,
        {
          method: "POST",
          body: {
            renditionId,
            expectedWorkingMasterId: currentMaster.id
          }
        }
      );
      queueOperation.accept(operationContext, renditionId);
      setStatus(status, text("youtubeAudioQueued", {
        id: response.rendition?.id || renditionId,
        workflow: WORKFLOW_NAME
      }));
      await refresh();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
      render();
    }
  }

  function render() {
    if (!state || !summary || !results || !queueButton) return;
    const currentMaster = state.master?.current;
    const processorEnabled = Boolean(state.renditions?.processorEnabled);
    const rows = Array.isArray(state.renditions?.renditions)
      ? state.renditions.renditions
      : [];
    summary.textContent = currentMaster
      ? text("youtubeAudioMasterReady", {
          revision: formatInteger(currentMaster.revision),
          bytes: formatBytes(currentMaster.objectBytes)
        })
      : text("youtubeAudioMasterRequired");
    queueButton.disabled = !canQueueCurrentOperation({
      currentId: currentMaster?.id,
      processorEnabled,
      authorized: canQueue(),
      rows,
      activeStatuses: ACTIVE_RENDITION_STATUSES
    });
    results.replaceChildren(
      ...(rows.length
        ? rows.map(renderRendition)
        : [emptyMessage(text("youtubeAudioNone"))])
    );
  }

  function renderRendition(rendition) {
    const article = document.createElement("article");
    article.className = `podcast-admin__readiness-card is-${
      rendition.status === "ready"
        ? "ready"
        : rendition.status === "failed"
          ? "failed"
          : "pending"
    }`;
    const heading = document.createElement("h3");
    heading.textContent = text("youtubeAudioRenditionLabel", {
      status: humanize(rendition.status)
    });
    const evidence = document.createElement("p");
    evidence.textContent = [
      formatBytes(rendition.sourceBytes),
      rendition.outputBytes ? formatBytes(rendition.outputBytes) : null,
      rendition.current
        ? text("youtubeAudioCurrent")
        : text("youtubeAudioStale"),
      rendition.selected ? text("youtubeAudioSelected") : null,
      rendition.nativeVideoPreferred
        ? text("youtubeAudioNativePreferred")
        : null
    ].filter(Boolean).join(" · ");
    const identifier = document.createElement("code");
    identifier.textContent = rendition.id;
    article.append(heading, evidence, identifier);
    if (rendition.failureCode) {
      const failure = document.createElement("p");
      failure.className = "podcast-admin__status is-error";
      failure.textContent = text("youtubeAudioFailure", {
        code: humanize(rendition.failureCode)
      });
      article.append(failure);
    }
    if (["queued", "rendering", "completing"].includes(rendition.status)) {
      const workflow = document.createElement("p");
      workflow.textContent = text("youtubeAudioRunWorkflow", {
        workflow: WORKFLOW_NAME
      });
      article.append(workflow);
    }
    return article;
  }

  return {
    setEpisodes,
    refresh,
    reset() {
      requestId += 1;
      state = null;
      queueOperation.reset();
      results?.replaceChildren();
      if (summary) summary.textContent = "";
      if (queueButton) queueButton.disabled = true;
      setStatus(status, "");
    }
  };
}

function emptyMessage(value) {
  const message = document.createElement("p");
  message.className = "podcast-admin__empty";
  message.textContent = value;
  return message;
}


function humanize(value) {
  return String(value || "").replaceAll("_", " ");
}
