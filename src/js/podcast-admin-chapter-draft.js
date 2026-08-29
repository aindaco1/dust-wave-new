import {
  CHAPTER_DRAFT_LANGUAGES,
  normalizeChapterDraftCollection,
  normalizeChapterDraftResponse
} from "./podcast-admin-chapter-draft-contract.js";
import {
  createEditorialDraftLifecycle,
  preferredEditorialDraft
} from "./podcast-admin-editorial-draft-lifecycle.js";
import { formatWholeSecondTimestamp } from
  "./podcast-admin-formatters.js";

export {
  normalizeChapterDraftCollection,
  normalizeChapterDraftResponse
} from "./podcast-admin-chapter-draft-contract.js";

export function mountChapterDraftAssistant({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  hasExistingChapters = () => false,
  applyChapters,
  confirmReplace = globalThis.confirm?.bind(globalThis)
}) {
  if (!root || !client || typeof applyChapters !== "function") {
    throw new TypeError("Chapter-draft assistant controls are required");
  }
  const sourceLanguage = root.querySelector(
    "[data-podcast-chapter-draft-source-language]"
  );
  const outputLanguage = root.querySelector(
    "[data-podcast-chapter-draft-output-language]"
  );
  const generate = root.querySelector("[data-podcast-chapter-draft-generate]");
  const status = root.querySelector("[data-podcast-chapter-draft-status]");
  const review = root.querySelector("[data-podcast-chapter-draft-review]");
  const evidence = root.querySelector("[data-podcast-chapter-draft-evidence]");
  const list = root.querySelector("[data-podcast-chapter-draft-list]");
  const apply = root.querySelector("[data-podcast-chapter-draft-apply]");
  const dismiss = root.querySelector("[data-podcast-chapter-draft-dismiss]");
  if (
    !sourceLanguage
    || !outputLanguage
    || !generate
    || !status
    || !review
    || !evidence
    || !list
    || !apply
    || !dismiss
  ) {
    throw new TypeError("Chapter-draft assistant markup is incomplete");
  }

  let episodeId = "";
  let editable = false;
  let result = null;
  let applied = false;
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
    apply.disabled = generating || !result || !editable || applied;
    dismiss.disabled = generating || !result;
  }

  function resetReview() {
    result = null;
    applied = false;
    review.hidden = true;
    evidence.textContent = "";
    list.replaceChildren();
    setStatus(status, "");
    refresh();
  }

  async function generateDraft() {
    if (requests.isBusy("generating") || !episodeId || !editable) return;
    await requests.run("generating", {
      before() {
        resetReview();
        setStatus(status, text("chapterDraftGenerating"));
      },
      request: (requestedEpisodeId) => client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/chapters/draft`,
        {
          method: "POST",
          body: {
            sourceLanguage: sourceLanguage.value,
            outputLanguage: outputLanguage.value
          }
        }
      ),
      onSuccess(payload) {
        renderResult(normalizeChapterDraftResponse(payload));
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
        setStatus(status, text("chapterDraftLoadingAutomatic"));
      },
      request: (requestedEpisodeId) => client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/chapters/drafts`
      ),
      onSuccess(payload) {
        const preferred = preferredEditorialDraft(
          normalizeChapterDraftCollection(payload),
          sourceLanguage.value,
          outputLanguage.value
        );
        if (preferred) {
          sourceLanguage.value = preferred.source.language;
          outputLanguage.value = preferred.outputLanguage;
          renderResult(preferred);
        } else {
          setStatus(status, text("chapterDraftAutomaticPending"));
        }
      },
      onError(error) {
        setStatus(status, friendlyError(error), true);
      }
    });
  }

  function renderResult(nextResult) {
    result = nextResult;
    applied = false;
    evidence.textContent = text("chapterDraftEvidence", {
      language: text(`language_${result.source.language}`),
      revision: result.source.revision,
      total: result.source.totalCueCount
    });
    renderChapterList(list, result.draft.chapters);
    review.hidden = false;
    setStatus(
      status,
      text(result.saved ? "chapterDraftAutomaticReady" : "chapterDraftReady")
    );
  }

  function applyDraft() {
    if (!result || !editable || applied) return;
    if (
      hasExistingChapters()
      && typeof confirmReplace === "function"
      && !confirmReplace(text("chapterDraftReplaceConfirm"))
    ) return;
    applyChapters(result.draft.chapters.map((chapter) => ({ ...chapter })));
    applied = true;
    setStatus(status, text("chapterDraftApplied"));
    refresh();
  }

  function dismissDraft() {
    if (!result) return;
    resetReview();
    setStatus(status, text("chapterDraftDismissed"));
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
      const language = CHAPTER_DRAFT_LANGUAGES.has(nextSourceLanguage)
        ? nextSourceLanguage
        : "es";
      sourceLanguage.value = language;
      outputLanguage.value = language;
      refresh();
      return normalizedEpisodeId ? loadSavedDraft() : Promise.resolve();
    }
  };
}

function renderChapterList(target, chapters) {
  const document = target.ownerDocument;
  const items = chapters.map((chapter) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = `PT${Math.max(0, chapter.startsAtMs / 1_000)}S`;
    time.textContent = formatWholeSecondTimestamp(chapter.startsAtMs);
    const title = document.createElement("span");
    title.textContent = chapter.title;
    item.append(time, title);
    return item;
  });
  target.replaceChildren(...items);
}
