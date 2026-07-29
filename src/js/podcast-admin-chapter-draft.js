const LANGUAGES = new Set(["en", "es"]);
const MAXIMUM_CHAPTERS = 24;

export function normalizeChapterDraftResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Chapter-draft response must be an object");
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
    || !Array.isArray(draft.chapters)
    || draft.chapters.length < 1
    || draft.chapters.length > MAXIMUM_CHAPTERS
  ) {
    throw new TypeError("Chapter-draft response is incomplete");
  }
  let previousStart = -1;
  const identifiers = new Set();
  const chapters = draft.chapters.map((candidate, index) => {
    if (
      !candidate
      || typeof candidate !== "object"
      || Array.isArray(candidate)
    ) {
      throw new TypeError("Chapter-draft chapter is invalid");
    }
    const id = String(candidate.id || "");
    const startsAtMs = Number(candidate.startsAtMs);
    const title = boundedTitle(candidate.title);
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(id)
      || identifiers.has(id)
      || !Number.isSafeInteger(startsAtMs)
      || startsAtMs < 0
      || startsAtMs <= previousStart
      || (index === 0 && startsAtMs !== 0)
      || candidate.url !== ""
      || candidate.imageUrl !== ""
      || candidate.toc !== true
    ) {
      throw new TypeError("Chapter-draft chapter evidence is invalid");
    }
    identifiers.add(id);
    previousStart = startsAtMs;
    return {
      id,
      startsAtMs,
      title,
      url: "",
      imageUrl: "",
      toc: true
    };
  });
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
    || includedCueCount !== totalCueCount
    || source.truncated !== false
    || !/^[a-f0-9]{64}$/i.test(String(source.contentSha256 || ""))
    || value.reviewRequired !== true
    || value.saved !== false
  ) {
    throw new TypeError("Chapter-draft evidence is invalid");
  }
  return {
    draft: { chapters },
    source: {
      language,
      revision,
      includedCueCount,
      totalCueCount
    },
    outputLanguage
  };
}

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
    generate.disabled = generating || !episodeId || !editable;
    sourceLanguage.disabled = generating || !editable;
    outputLanguage.disabled = generating || !editable;
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
      result = normalizeChapterDraftResponse(payload);
      evidence.textContent = text("chapterDraftEvidence", {
        language: text(`language_${result.source.language}`),
        revision: result.source.revision,
        total: result.source.totalCueCount
      });
      renderChapterList(list, result.draft.chapters);
      review.hidden = false;
      setStatus(status, text("chapterDraftReady"));
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

function boundedTitle(value) {
  if (typeof value !== "string") {
    throw new TypeError("Chapter-draft title must be text");
  }
  const normalized = value.trim();
  if (
    !normalized
    || normalized.length > 160
    || /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(normalized)
    || /<[^>]*>/u.test(normalized)
  ) {
    throw new TypeError("Chapter-draft title is invalid");
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
