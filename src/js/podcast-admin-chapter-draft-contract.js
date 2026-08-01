export const CHAPTER_DRAFT_LANGUAGES = new Set(["en", "es"]);
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
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
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
    return { id, startsAtMs, title, url: "", imageUrl: "", toc: true };
  });
  const language = String(source.language || "");
  const outputLanguage = String(value.outputLanguage || "");
  const revision = Number(source.revision);
  const includedCueCount = Number(source.includedCueCount);
  const totalCueCount = Number(source.totalCueCount);
  const saved = value.saved === true;
  const completedAt = String(value.completedAt || "");
  if (
    !CHAPTER_DRAFT_LANGUAGES.has(language)
    || !CHAPTER_DRAFT_LANGUAGES.has(outputLanguage)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(includedCueCount)
    || includedCueCount < 1
    || includedCueCount !== totalCueCount
    || source.truncated !== false
    || !/^[a-f0-9]{64}$/i.test(String(source.contentSha256 || ""))
    || value.reviewRequired !== true
    || (value.saved !== false && value.saved !== true)
    || (saved && !/^[A-Za-z0-9_-]{1,100}$/.test(String(value.id || "")))
    || (saved && !/^[A-Za-z0-9_-]{1,100}$/.test(
      String(source.alignmentRevisionId || "")
    ))
    || (saved && !/^[a-f0-9]{64}$/i.test(String(value.draftSha256 || "")))
    || (saved && !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(completedAt))
  ) {
    throw new TypeError("Chapter-draft evidence is invalid");
  }
  return {
    ...(saved ? {
      id: String(value.id),
      draftSha256: String(value.draftSha256).toLowerCase(),
      completedAt
    } : {}),
    draft: { chapters },
    source: {
      language,
      revision,
      contentSha256: String(source.contentSha256).toLowerCase(),
      ...(saved ? {
        alignmentRevisionId: String(source.alignmentRevisionId)
      } : {}),
      includedCueCount,
      totalCueCount,
      truncated: false
    },
    outputLanguage,
    reviewRequired: true,
    saved
  };
}

export function normalizeChapterDraftCollection(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || !Array.isArray(value.drafts)
    || value.drafts.length > 10
    || !/^[A-Za-z0-9_-]{1,100}$/.test(String(value.episodeId || ""))
  ) throw new TypeError("Chapter-draft collection is invalid");
  return value.drafts.map((draft) => {
    const normalized = normalizeChapterDraftResponse(draft);
    if (!normalized.saved) {
      throw new TypeError("Saved chapter proposal is invalid");
    }
    return normalized;
  });
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
  ) throw new TypeError("Chapter-draft title is invalid");
  return normalized;
}
