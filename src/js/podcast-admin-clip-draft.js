import {
  CLIP_DRAFT_LANGUAGES,
  normalizeClipDraftCollection,
  normalizeClipDraftResponse
} from "./podcast-admin-clip-draft-contract.js";

export {
  normalizeClipDraftCollection,
  normalizeClipDraftResponse
} from "./podcast-admin-clip-draft-contract.js";

export function mountClipDraftAssistant({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  form,
  selectedRecipeId = () => "",
  clearSelectedRecipe,
  fillCueSelects,
  refreshRecipe,
  hasExistingRecipe = () => Boolean(
    selectedRecipeId() || form?.elements.title.value.trim()
  ),
  applyCandidate,
  confirmReplace = globalThis.confirm?.bind(globalThis)
}) {
  if (
    !root
    || !client
    || (
      typeof applyCandidate !== "function"
      && (
        !form
        || typeof clearSelectedRecipe !== "function"
        || typeof fillCueSelects !== "function"
        || typeof refreshRecipe !== "function"
      )
    )
  ) {
    throw new TypeError("Clip-draft assistant controls are required");
  }
  const apply = applyCandidate ?? ((candidate) => {
    clearSelectedRecipe();
    form.reset();
    form.elements.title.value = candidate.title;
    form.elements.aspectRatio.value = "9:16";
    form.elements.boundaryMode.value = "segment";
    form.elements.templateId.value = "captioned-waveform-v1";
    fillCueSelects(candidate);
    refreshRecipe();
  });
  const sourceLanguage = control(root, "source-language");
  const outputLanguage = control(root, "output-language");
  const generate = control(root, "generate");
  const status = control(root, "status");
  const review = control(root, "review");
  const evidence = control(root, "evidence");
  const list = control(root, "list");
  const dismiss = control(root, "dismiss");

  let context = emptyContext();
  let editable = false;
  let generating = false;
  let loading = false;
  let generationRevision = 0;
  let result = null;
  let appliedCandidateId = "";

  generate.addEventListener("click", generateDraft);
  dismiss.addEventListener("click", dismissDraft);
  outputLanguage.addEventListener("change", resetReview);

  function eligible() {
    return editable
      && context.episodeId
      && CLIP_DRAFT_LANGUAGES.has(context.language)
      && context.status === "approved"
      && context.revision > 0
      && context.approvedRevision === context.revision
      && /^[a-f0-9]{64}$/.test(context.contentSha256)
      && !context.dirty;
  }

  function refresh() {
    root.hidden = !editable || !context.episodeId;
    generate.disabled = generating || loading || !eligible();
    sourceLanguage.disabled = true;
    outputLanguage.disabled = generating || loading || !editable;
    dismiss.disabled = generating || !result;
  }

  function resetReview() {
    result = null;
    appliedCandidateId = "";
    review.hidden = true;
    evidence.textContent = "";
    list.replaceChildren();
    setStatus(status, "");
    refresh();
  }

  async function generateDraft() {
    if (generating || !eligible()) return;
    generating = true;
    const requestRevision = ++generationRevision;
    const requestedContext = { ...context };
    resetReview();
    setStatus(status, text("clipDraftGenerating"));
    refresh();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedContext.episodeId
        )}/clips/draft`,
        {
          method: "POST",
          body: {
            sourceLanguage: requestedContext.language,
            outputLanguage: outputLanguage.value
          }
        }
      );
      if (
        requestRevision !== generationRevision
        || requestedContext.key !== context.key
      ) return;
      const normalized = normalizeClipDraftResponse(payload);
      if (!matchesContext(normalized.source, context)) {
        throw new TypeError("Clip-draft source evidence changed");
      }
      renderResult(normalized);
    } catch (error) {
      if (
        requestRevision === generationRevision
        && requestedContext.key === context.key
      ) setStatus(status, friendlyError(error), true);
    } finally {
      if (requestRevision === generationRevision) generating = false;
      refresh();
    }
  }

  async function loadSavedDraft() {
    if (!eligible()) {
      setStatus(status, text("clipDraftAutomaticPending"));
      return;
    }
    const requestRevision = ++generationRevision;
    const requestedContext = { ...context };
    loading = true;
    resetReview();
    setStatus(status, text("clipDraftLoadingAutomatic"));
    refresh();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedContext.episodeId
        )}/clips/drafts`
      );
      if (
        requestRevision !== generationRevision
        || requestedContext.key !== context.key
      ) return;
      const drafts = normalizeClipDraftCollection(payload);
      const preferred = drafts.find((candidate) =>
        candidate.source.language === context.language
        && candidate.outputLanguage === outputLanguage.value
      ) || drafts.find((candidate) =>
        candidate.outputLanguage === outputLanguage.value
      ) || drafts[0];
      if (preferred) {
        sourceLanguage.value = preferred.source.language;
        outputLanguage.value = preferred.outputLanguage;
        renderResult(preferred);
      } else {
        setStatus(status, text("clipDraftAutomaticPending"));
      }
    } catch (error) {
      if (
        requestRevision === generationRevision
        && requestedContext.key === context.key
      ) setStatus(status, friendlyError(error), true);
    } finally {
      if (requestRevision === generationRevision) loading = false;
      refresh();
    }
  }

  function renderResult(nextResult) {
    result = nextResult;
    appliedCandidateId = "";
    evidence.textContent = text("clipDraftEvidence", {
      language: text(`language_${result.source.language}`),
      revision: result.source.revision,
      total: result.source.totalCueCount
    });
    renderCandidates();
    review.hidden = false;
    setStatus(
      status,
      text(result.saved ? "clipDraftAutomaticReady" : "clipDraftReady")
    );
  }

  function renderCandidates() {
    const document = list.ownerDocument;
    const items = result.draft.candidates.map((candidate) => {
      const item = document.createElement("li");
      const heading = document.createElement("h5");
      const timing = document.createElement("p");
      const reason = document.createElement("p");
      const use = document.createElement("button");
      heading.textContent = candidate.title;
      timing.className = "podcast-admin__review-evidence";
      timing.textContent = text("clipDraftCandidateTiming", {
        start: millisecondsToTimestamp(candidate.startsAtMs),
        end: millisecondsToTimestamp(candidate.endsAtMs),
        seconds: Math.round(candidate.durationMs / 1_000)
      });
      reason.textContent = candidate.reason;
      use.className = "btn btn-danger";
      use.type = "button";
      use.textContent = text("clipDraftUseCandidate");
      use.disabled = candidate.id === appliedCandidateId;
      use.addEventListener("click", () => useCandidate(candidate));
      item.append(heading, timing, reason, use);
      return item;
    });
    list.replaceChildren(...items);
  }

  function useCandidate(candidate) {
    if (!result || !eligible() || !matchesContext(result.source, context)) {
      resetReview();
      setStatus(status, text("clipDraftEvidenceChanged"), true);
      return;
    }
    if (
      hasExistingRecipe()
      && typeof confirmReplace === "function"
      && !confirmReplace(text("clipDraftReplaceConfirm"))
    ) return;
    apply({ ...candidate });
    appliedCandidateId = candidate.id;
    renderCandidates();
    setStatus(status, text("clipDraftApplied"));
  }

  function dismissDraft() {
    if (!result) return;
    resetReview();
    setStatus(status, text("clipDraftDismissed"));
  }

  resetReview();
  return {
    setEditable(nextEditable) {
      const wasEditable = editable;
      editable = Boolean(nextEditable);
      refresh();
      if (!wasEditable && editable && eligible()) void loadSavedDraft();
    },
    setTranscript(nextEpisodeId, transcript, dirty = false) {
      const next = transcriptContext(nextEpisodeId, transcript, dirty);
      const changed = next.key !== context.key;
      if (changed) {
        context = next;
        generationRevision += 1;
        generating = false;
        loading = false;
        resetReview();
      } else {
        context = next;
      }
      sourceLanguage.value = context.language || "es";
    if (!CLIP_DRAFT_LANGUAGES.has(outputLanguage.value)) {
        outputLanguage.value = context.language || "es";
      }
      refresh();
      if (changed && editable && context.episodeId) return loadSavedDraft();
      return Promise.resolve();
    }
  };
}

export function resolveClipCueRange(cues, startCueId, endCueId) {
  const values = Array.isArray(cues) ? cues : [];
  const startIndex = values.findIndex(({ id }) => id === startCueId);
  const endIndex = values.findIndex(({ id }) => id === endCueId);
  if (startIndex < 0 || endIndex < startIndex) return null;
  const startsAtMs = Number(values[startIndex].startsAtMs);
  const endsAtMs = Number(values[endIndex].endsAtMs);
  return { startsAtMs, endsAtMs, durationMs: endsAtMs - startsAtMs };
}

export function clipDurationLabel(value, text, locale = "en") {
  const seconds = Number(value || 0) / 1_000;
  return text("secondsCount", {
    count: new Intl.NumberFormat(locale, {
      maximumFractionDigits: seconds < 10 ? 1 : 0
    }).format(seconds)
  });
}

function control(root, name) {
  const value = root.querySelector(`[data-podcast-clip-draft-${name}]`);
  if (!value) throw new TypeError("Clip-draft assistant markup is incomplete");
  return value;
}

function transcriptContext(episodeId, transcript, dirty) {
  const context = {
    episodeId: String(episodeId || ""),
    language: String(transcript?.language || ""),
    status: String(transcript?.status || ""),
    revision: Number(transcript?.revision || 0),
    approvedRevision: Number(transcript?.approvedRevision || 0),
    contentSha256: String(transcript?.contentSha256 || "").toLowerCase(),
    dirty: Boolean(dirty)
  };
  context.key = [
    context.episodeId,
    context.language,
    context.status,
    context.revision,
    context.approvedRevision,
    context.contentSha256,
    context.dirty ? "dirty" : "clean"
  ].join(":");
  return context;
}

function emptyContext() {
  return transcriptContext("", null, false);
}

function matchesContext(source, context) {
  return source.language === context.language
    && source.revision === context.revision
    && source.contentSha256 === context.contentSha256;
}

function millisecondsToTimestamp(value) {
  const totalSeconds = Math.max(0, Math.floor(value / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return (hours ? [hours, minutes, seconds] : [minutes, seconds])
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, "0")
    )
    .join(":");
}
