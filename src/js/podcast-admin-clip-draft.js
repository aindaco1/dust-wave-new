const LANGUAGES = new Set(["en", "es"]);
const MAXIMUM_CANDIDATES = 6;

export function normalizeClipDraftResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Clip-draft response must be an object");
  }
  const draft = value.draft;
  const source = value.source;
  if (
    !draft
    || typeof draft !== "object"
    || Array.isArray(draft)
    || !source
    || typeof source !== "object"
    || Array.isArray(source)
    || !Array.isArray(draft.candidates)
    || draft.candidates.length < 1
    || draft.candidates.length > MAXIMUM_CANDIDATES
  ) {
    throw new TypeError("Clip-draft response is incomplete");
  }
  let previousEnd = -1;
  const identifiers = new Set();
  const candidates = draft.candidates.map((candidate) => {
    if (
      !candidate
      || typeof candidate !== "object"
      || Array.isArray(candidate)
    ) {
      throw new TypeError("Clip-draft candidate is invalid");
    }
    const normalized = {
      id: validIdentifier(candidate.id, "candidate id"),
      title: boundedText(candidate.title, "candidate title", 160),
      reason: boundedText(candidate.reason, "candidate reason", 280),
      startCueId: validIdentifier(candidate.startCueId, "start cue id"),
      endCueId: validIdentifier(candidate.endCueId, "end cue id"),
      startsAtMs: validMilliseconds(candidate.startsAtMs),
      endsAtMs: validMilliseconds(candidate.endsAtMs),
      durationMs: validMilliseconds(candidate.durationMs)
    };
    if (
      identifiers.has(normalized.id)
      || normalized.startsAtMs <= previousEnd
      || normalized.endsAtMs <= normalized.startsAtMs
      || normalized.durationMs
        !== normalized.endsAtMs - normalized.startsAtMs
      || normalized.durationMs < 15_000
      || normalized.durationMs > 90_000
    ) {
      throw new TypeError("Clip-draft candidate evidence is invalid");
    }
    identifiers.add(normalized.id);
    previousEnd = normalized.endsAtMs;
    return normalized;
  });
  const language = String(source.language || "");
  const outputLanguage = String(value.outputLanguage || "");
  const revision = Number(source.revision);
  const includedCueCount = Number(source.includedCueCount);
  const totalCueCount = Number(source.totalCueCount);
  const contentSha256 = String(source.contentSha256 || "").toLowerCase();
  if (
    !LANGUAGES.has(language)
    || !LANGUAGES.has(outputLanguage)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(includedCueCount)
    || includedCueCount < 1
    || includedCueCount !== totalCueCount
    || source.truncated !== false
    || !/^[a-f0-9]{64}$/.test(contentSha256)
    || value.reviewRequired !== true
    || value.saved !== false
  ) {
    throw new TypeError("Clip-draft evidence is invalid");
  }
  return {
    draft: { candidates },
    source: {
      language,
      revision,
      contentSha256,
      includedCueCount,
      totalCueCount
    },
    outputLanguage
  };
}

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
  let generationRevision = 0;
  let result = null;
  let appliedCandidateId = "";

  generate.addEventListener("click", generateDraft);
  dismiss.addEventListener("click", dismissDraft);
  outputLanguage.addEventListener("change", resetReview);

  function eligible() {
    return editable
      && context.episodeId
      && LANGUAGES.has(context.language)
      && context.status === "approved"
      && context.revision > 0
      && context.approvedRevision === context.revision
      && /^[a-f0-9]{64}$/.test(context.contentSha256)
      && !context.dirty;
  }

  function refresh() {
    root.hidden = !editable || !context.episodeId;
    generate.disabled = generating || !eligible();
    sourceLanguage.disabled = true;
    outputLanguage.disabled = generating || !editable;
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
      result = normalizeClipDraftResponse(payload);
      if (!matchesContext(result.source, context)) {
        throw new TypeError("Clip-draft source evidence changed");
      }
      evidence.textContent = text("clipDraftEvidence", {
        language: text(`language_${result.source.language}`),
        revision: result.source.revision,
        total: result.source.totalCueCount
      });
      renderCandidates();
      review.hidden = false;
      setStatus(status, text("clipDraftReady"));
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
      editable = Boolean(nextEditable);
      refresh();
    },
    setTranscript(nextEpisodeId, transcript, dirty = false) {
      const next = transcriptContext(nextEpisodeId, transcript, dirty);
      if (next.key !== context.key) {
        context = next;
        generationRevision += 1;
        generating = false;
        resetReview();
      } else {
        context = next;
      }
      sourceLanguage.value = context.language || "es";
      if (!LANGUAGES.has(outputLanguage.value)) {
        outputLanguage.value = context.language || "es";
      }
      refresh();
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
    context.contentSha256
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

function validIdentifier(value, field) {
  const normalized = String(value || "");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(normalized)) {
    throw new TypeError(`Clip-draft ${field} is invalid`);
  }
  return normalized;
}

function validMilliseconds(value) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new TypeError("Clip-draft timing is invalid");
  }
  return normalized;
}

function boundedText(value, field, maximumCharacters) {
  if (typeof value !== "string") {
    throw new TypeError(`Clip-draft ${field} must be text`);
  }
  const normalized = value.trim();
  if (
    !normalized
    || normalized.length > maximumCharacters
    || /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(normalized)
    || /<[^>]*>/u.test(normalized)
  ) {
    throw new TypeError(`Clip-draft ${field} is invalid`);
  }
  return normalized;
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
