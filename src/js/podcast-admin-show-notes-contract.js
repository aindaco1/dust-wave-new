export const SHOW_NOTES_LANGUAGES = new Set(["en", "es"]);

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
    !SHOW_NOTES_LANGUAGES.has(language)
    || !SHOW_NOTES_LANGUAGES.has(outputLanguage)
    || !Number.isSafeInteger(revision)
    || revision < 1
    || !Number.isSafeInteger(includedCueCount)
    || includedCueCount < 1
    || !Number.isSafeInteger(totalCueCount)
    || totalCueCount < includedCueCount
    || typeof source.truncated !== "boolean"
    || !/^[a-f0-9]{64}$/i.test(String(source.contentSha256 || ""))
    || value.reviewRequired !== true
    || (value.saved !== false && value.saved !== true)
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
    outputLanguage,
    saved: value.saved,
    id: typeof value.id === "string" ? value.id : "",
    completedAt: typeof value.completedAt === "string"
      ? value.completedAt
      : ""
  };
}

export function normalizeShowNotesDraftCollection(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
    || !Array.isArray(value.drafts)
    || value.drafts.length > 10
  ) {
    throw new TypeError("Show-notes draft collection is invalid");
  }
  return value.drafts.map(normalizeShowNotesDraftResponse);
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
