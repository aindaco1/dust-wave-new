const LANGUAGES = new Set(["en", "es"]);

export function normalizeShowNotesDraftResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Show-notes response must be an object");
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
  ) {
    throw new TypeError("Show-notes response is incomplete");
  }
  const summary = boundedText(draft.summary, 1_200, "summary");
  const showNotesMarkdown = boundedText(
    draft.showNotesMarkdown,
    8_000,
    "showNotesMarkdown"
  );
  if (!Array.isArray(draft.keywords) || draft.keywords.length > 10) {
    throw new TypeError("Show-notes keywords are invalid");
  }
  const keywords = draft.keywords.map((keyword) =>
    boundedText(keyword, 60, "keyword", { allowNewlines: false })
  );
  const language = String(source.language || "");
  const outputLanguage = String(value.outputLanguage || "");
  const revision = Number(source.revision);
  const includedCueCount = Number(source.includedCueCount);
  const totalCueCount = Number(source.totalCueCount);
  if (
    !LANGUAGES.has(language)
    || !LANGUAGES.has(outputLanguage)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(includedCueCount)
    || includedCueCount < 1
    || !Number.isSafeInteger(totalCueCount)
    || totalCueCount < includedCueCount
    || typeof source.truncated !== "boolean"
    || !/^[a-f0-9]{64}$/i.test(String(source.contentSha256 || ""))
    || value.reviewRequired !== true
    || value.saved !== false
  ) {
    throw new TypeError("Show-notes evidence is invalid");
  }
  return {
    draft: { summary, showNotesMarkdown, keywords },
    source: {
      language,
      revision,
      includedCueCount,
      totalCueCount,
      truncated: source.truncated
    },
    outputLanguage
  };
}

export function mountShowNotesAssistant({
  root,
  notesEditor,
  client,
  text,
  setStatus,
  friendlyError,
  confirmReplace = globalThis.confirm?.bind(globalThis)
}) {
  if (!root || !notesEditor || !client) {
    throw new TypeError("Show-notes assistant controls are required");
  }
  const sourceLanguage = root.querySelector(
    "[data-podcast-show-notes-source-language]"
  );
  const outputLanguage = root.querySelector(
    "[data-podcast-show-notes-output-language]"
  );
  const generate = root.querySelector("[data-podcast-show-notes-generate]");
  const status = root.querySelector("[data-podcast-show-notes-status]");
  const review = root.querySelector("[data-podcast-show-notes-review]");
  const evidence = root.querySelector("[data-podcast-show-notes-evidence]");
  const summary = root.querySelector("[data-podcast-show-notes-summary]");
  const draft = root.querySelector("[data-podcast-show-notes-draft]");
  const keywords = root.querySelector("[data-podcast-show-notes-keywords]");
  const apply = root.querySelector("[data-podcast-show-notes-apply]");
  const dismiss = root.querySelector("[data-podcast-show-notes-dismiss]");
  if (
    !sourceLanguage
    || !outputLanguage
    || !generate
    || !status
    || !review
    || !evidence
    || !summary
    || !draft
    || !keywords
    || !apply
    || !dismiss
  ) {
    throw new TypeError("Show-notes assistant markup is incomplete");
  }

  let episodeId = "";
  let editable = false;
  let generating = false;
  let generationRevision = 0;
  let result = null;

  generate.addEventListener("click", generateDraft);
  apply.addEventListener("click", applyDraft);
  dismiss.addEventListener("click", dismissDraft);
  sourceLanguage.addEventListener("change", resetReview);
  outputLanguage.addEventListener("change", resetReview);

  function refresh() {
    root.hidden = !episodeId || !editable;
    generate.disabled = generating || !episodeId || !editable;
    sourceLanguage.disabled = generating || !editable;
    outputLanguage.disabled = generating || !editable;
    apply.disabled = generating || !result || !editable;
    dismiss.disabled = generating || !result;
  }

  function resetReview() {
    result = null;
    review.hidden = true;
    evidence.textContent = "";
    summary.textContent = "";
    draft.textContent = "";
    keywords.textContent = "";
    setStatus(status, "");
    refresh();
  }

  async function generateDraft() {
    if (generating || !episodeId || !editable) return;
    generating = true;
    const requestRevision = ++generationRevision;
    const requestedEpisodeId = episodeId;
    resetReview();
    setStatus(status, text("showNotesGenerating"));
    refresh();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/show-notes/draft`,
        {
          method: "POST",
          body: {
            sourceLanguage: sourceLanguage.value,
            outputLanguage: outputLanguage.value
          }
        }
      );
      if (
        requestRevision !== generationRevision
        || requestedEpisodeId !== episodeId
      ) return;
      result = normalizeShowNotesDraftResponse(payload);
      evidence.textContent = text(
        result.source.truncated
          ? "showNotesEvidencePartial"
          : "showNotesEvidenceComplete",
        {
          language: text(`language_${result.source.language}`),
          revision: result.source.revision,
          included: result.source.includedCueCount,
          total: result.source.totalCueCount
        }
      );
      summary.textContent = result.draft.summary;
      draft.textContent = result.draft.showNotesMarkdown;
      keywords.textContent = result.draft.keywords.join(" · ");
      review.hidden = false;
      setStatus(status, text("showNotesReady"));
    } catch (error) {
      if (
        requestRevision === generationRevision
        && requestedEpisodeId === episodeId
      ) {
        setStatus(status, friendlyError(error), true);
      }
    } finally {
      if (requestRevision === generationRevision) generating = false;
      refresh();
    }
  }

  function applyDraft() {
    if (!result || !editable) return;
    if (
      notesEditor.getMarkdown().trim()
      && typeof confirmReplace === "function"
      && !confirmReplace(text("showNotesReplaceConfirm"))
    ) return;
    notesEditor.setValue(result.draft.showNotesMarkdown);
    setStatus(status, text("showNotesApplied"));
    notesEditor.focus();
  }

  function dismissDraft() {
    if (!result) return;
    resetReview();
    setStatus(status, text("showNotesDismissed"));
  }

  resetReview();
  return {
    setEditable(nextEditable) {
      editable = Boolean(nextEditable);
      refresh();
    },
    setEpisode(nextEpisodeId, nextSourceLanguage = "es") {
      const normalizedEpisodeId = String(nextEpisodeId || "");
      if (normalizedEpisodeId !== episodeId) {
        episodeId = normalizedEpisodeId;
        generationRevision += 1;
        generating = false;
        resetReview();
      }
      const language = LANGUAGES.has(nextSourceLanguage)
        ? nextSourceLanguage
        : "es";
      sourceLanguage.value = language;
      outputLanguage.value = language;
      refresh();
    }
  };
}

function boundedText(
  value,
  maximumCharacters,
  field,
  { allowNewlines = true } = {}
) {
  if (typeof value !== "string") {
    throw new TypeError(`Show-notes ${field} must be text`);
  }
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (
    !normalized
    || normalized.length > maximumCharacters
    || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u
      .test(normalized)
    || (!allowNewlines && normalized.includes("\n"))
  ) {
    throw new TypeError(`Show-notes ${field} is invalid`);
  }
  return normalized;
}
