export const CLIP_DRAFT_LANGUAGES = new Set(["en", "es"]);
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
    ) throw new TypeError("Clip-draft candidate is invalid");
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
    ) throw new TypeError("Clip-draft candidate evidence is invalid");
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
  const saved = value.saved === true;
  const completedAt = String(value.completedAt || "");
  if (
    !CLIP_DRAFT_LANGUAGES.has(language)
    || !CLIP_DRAFT_LANGUAGES.has(outputLanguage)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(includedCueCount)
    || includedCueCount < 1
    || includedCueCount !== totalCueCount
    || source.truncated !== false
    || !/^[a-f0-9]{64}$/.test(contentSha256)
    || value.reviewRequired !== true
    || (value.saved !== false && value.saved !== true)
    || (saved && !/^[A-Za-z0-9_-]{1,100}$/.test(String(value.id || "")))
    || (saved && !/^[A-Za-z0-9_-]{1,100}$/.test(
      String(source.alignmentRevisionId || "")
    ))
    || (saved && !/^[a-f0-9]{64}$/i.test(String(value.draftSha256 || "")))
    || (saved && !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(completedAt))
  ) throw new TypeError("Clip-draft evidence is invalid");
  return {
    ...(saved ? {
      id: String(value.id),
      draftSha256: String(value.draftSha256).toLowerCase(),
      completedAt
    } : {}),
    draft: { candidates },
    source: {
      language,
      revision,
      contentSha256,
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

export function normalizeClipDraftCollection(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || !Array.isArray(value.drafts)
    || value.drafts.length > 10
    || !/^[A-Za-z0-9_-]{1,100}$/.test(String(value.episodeId || ""))
  ) throw new TypeError("Clip-draft collection is invalid");
  return value.drafts.map((draft) => {
    const normalized = normalizeClipDraftResponse(draft);
    if (!normalized.saved) {
      throw new TypeError("Saved clip proposal is invalid");
    }
    return normalized;
  });
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
  ) throw new TypeError(`Clip-draft ${field} is invalid`);
  return normalized;
}
