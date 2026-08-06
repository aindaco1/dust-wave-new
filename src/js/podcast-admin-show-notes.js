import {
  normalizeShowNotesDraftCollection,
  normalizeShowNotesDraftResponse,
  SHOW_NOTES_LANGUAGES
} from "./podcast-admin-show-notes-contract.js";

export {
  normalizeShowNotesDraftCollection,
  normalizeShowNotesDraftResponse
} from "./podcast-admin-show-notes-contract.js";

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
  let loading = false;
  let generationRevision = 0;
  let result = null;

  generate.addEventListener("click", generateDraft);
  apply.addEventListener("click", applyDraft);
  dismiss.addEventListener("click", dismissDraft);
  sourceLanguage.addEventListener("change", resetReview);
  outputLanguage.addEventListener("change", resetReview);

  function refresh() {
    root.hidden = !episodeId || !editable;
    generate.disabled = generating || loading || !episodeId || !editable;
    sourceLanguage.disabled = generating || loading || !editable;
    outputLanguage.disabled = generating || loading || !editable;
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
      renderResult(normalizeShowNotesDraftResponse(payload));
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

  async function loadSavedDraft() {
    if (!episodeId) return;
    const requestRevision = ++generationRevision;
    const requestedEpisodeId = episodeId;
    loading = true;
    resetReview();
    setStatus(status, text("showNotesLoadingAutomatic"));
    refresh();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/show-notes/drafts`
      );
      if (
        requestRevision !== generationRevision
        || requestedEpisodeId !== episodeId
      ) return;
      const drafts = normalizeShowNotesDraftCollection(payload);
      const preferred = drafts.find((candidate) =>
        candidate.source.language === sourceLanguage.value
        && candidate.outputLanguage === outputLanguage.value
      ) || drafts.find((candidate) =>
        candidate.outputLanguage === outputLanguage.value
      ) || drafts[0];
      if (preferred) {
        sourceLanguage.value = preferred.source.language;
        outputLanguage.value = preferred.outputLanguage;
        renderResult(preferred);
      } else {
        setStatus(status, text("showNotesAutomaticPending"));
      }
    } catch (error) {
      if (
        requestRevision === generationRevision
        && requestedEpisodeId === episodeId
      ) {
        setStatus(status, friendlyError(error), true);
      }
    } finally {
      if (requestRevision === generationRevision) loading = false;
      refresh();
    }
  }

  function renderResult(nextResult) {
    result = nextResult;
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
    setStatus(
      status,
      text(result.saved ? "showNotesAutomaticReady" : "showNotesReady")
    );
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
        loading = false;
        resetReview();
      }
      const language = SHOW_NOTES_LANGUAGES.has(nextSourceLanguage)
        ? nextSourceLanguage
        : "es";
      sourceLanguage.value = language;
      outputLanguage.value = language;
      refresh();
      return normalizedEpisodeId ? loadSavedDraft() : Promise.resolve();
    }
  };
}
