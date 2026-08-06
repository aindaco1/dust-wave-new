import {
  CHAPTER_DRAFT_LANGUAGES,
  normalizeChapterDraftCollection,
  normalizeChapterDraftResponse
} from "./podcast-admin-chapter-draft-contract.js";

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
  let generating = false;
  let loading = false;
  let generationRevision = 0;
  let result = null;
  let applied = false;

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
    if (generating || !episodeId || !editable) return;
    generating = true;
    const requestRevision = ++generationRevision;
    const requestedEpisodeId = episodeId;
    resetReview();
    setStatus(status, text("chapterDraftGenerating"));
    refresh();
    try {
      const payload = await client.request(
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
      );
      if (
        requestRevision !== generationRevision
        || requestedEpisodeId !== episodeId
      ) return;
      renderResult(normalizeChapterDraftResponse(payload));
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
    setStatus(status, text("chapterDraftLoadingAutomatic"));
    refresh();
    try {
      const payload = await client.request(
        `/v1/admin/episodes/${encodeURIComponent(
          requestedEpisodeId
        )}/chapters/drafts`
      );
      if (
        requestRevision !== generationRevision
        || requestedEpisodeId !== episodeId
      ) return;
      const drafts = normalizeChapterDraftCollection(payload);
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
        setStatus(status, text("chapterDraftAutomaticPending"));
      }
    } catch (error) {
      if (
        requestRevision === generationRevision
        && requestedEpisodeId === episodeId
      ) setStatus(status, friendlyError(error), true);
    } finally {
      if (requestRevision === generationRevision) loading = false;
      refresh();
    }
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
        generationRevision += 1;
        generating = false;
        loading = false;
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
    time.textContent = millisecondsToTimestamp(chapter.startsAtMs);
    const title = document.createElement("span");
    title.textContent = chapter.title;
    item.append(time, title);
    return item;
  });
  target.replaceChildren(...items);
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
