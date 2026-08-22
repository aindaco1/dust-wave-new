import {
  normalizeShowNotesDraftCollection,
  normalizeShowNotesDraftResponse,
  SHOW_NOTES_LANGUAGES
} from "./podcast-admin-show-notes-contract.js";
import {
  createEditorialDraftLifecycle,
  preferredEditorialDraft
} from "./podcast-admin-editorial-draft-lifecycle.js";

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
  let result = null;
  const requests = createEditorialDraftLifecycle({
    getContextKey: () => episodeId,
    onBusyChange: refresh
  });

  generate.addEventListener("click", generateDraft);
  apply.addEventListener("click", applyDraft);
  dismiss.addEventListener("click", dismissDraft);
  sourceLanguage.addEventListener("change", resetReview);
  outputLanguage.addEventListener("change", resetReview);

  function refresh() {
    root.hidden = !episodeId || !editable;
    const generating = requests.isBusy("generating");
    const loading = requests.isBusy("loading");
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
    if (requests.isBusy("generating") || !episodeId || !editable) return;
    await requests.run("generating", {
      before() {
        resetReview();
        setStatus(status, text("showNotesGenerating"));
      },
      request: (requestedEpisodeId) => client.request(
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
      ),
      onSuccess(payload) {
        renderResult(normalizeShowNotesDraftResponse(payload));
      },
      onError(error) {
        setStatus(status, friendlyError(error), true);
      }
    });
  }

  async function loadSavedDraft() {
    if (!episodeId) return;
    await requests.run("loading", {
      before() {
        resetReview();
        setStatus(status, text("showNotesLoadingAutomatic"));
      },
      request: (requestedEpisodeId) => client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/show-notes/drafts`
      ),
      onSuccess(payload) {
        const preferred = preferredEditorialDraft(
          normalizeShowNotesDraftCollection(payload),
          sourceLanguage.value,
          outputLanguage.value
        );
        if (preferred) {
          sourceLanguage.value = preferred.source.language;
          outputLanguage.value = preferred.outputLanguage;
          renderResult(preferred);
        } else {
          setStatus(status, text("showNotesAutomaticPending"));
        }
      },
      onError(error) {
        setStatus(status, friendlyError(error), true);
      }
    });
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
        requests.invalidate();
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
