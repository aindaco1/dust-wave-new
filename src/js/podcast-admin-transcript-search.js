import {
  transcriptCuePlainText
} from "./podcast-admin-transcript-review.js";
import { formatLocalizedNumber as localizedNumber } from
  "./podcast-admin-formatters.js";

export const TRANSCRIPT_SEARCH_LIMITS = Object.freeze({
  maximumQueryCharacters: 160,
  maximumCues: 10_000
});

export class TranscriptSearchError extends Error {
  constructor(code) {
    super(code);
    this.name = "TranscriptSearchError";
    this.code = code;
  }
}

export function findTranscriptCueMatches(
  cues,
  rawQuery,
  language = "en"
) {
  const rows = Array.isArray(cues) ? cues : [];
  if (rows.length > TRANSCRIPT_SEARCH_LIMITS.maximumCues) {
    throw new TranscriptSearchError("transcript_search_too_many_cues");
  }
  const querySource = String(rawQuery || "");
  if (
    Array.from(querySource).length
    > TRANSCRIPT_SEARCH_LIMITS.maximumQueryCharacters
  ) {
    throw new TranscriptSearchError("transcript_search_query_too_long");
  }
  const query = normalizedSearchText(querySource, language);
  if (!query) {
    throw new TranscriptSearchError("transcript_search_query_required");
  }

  const cueIndexes = [];
  rows.forEach((cue, cueIndex) => {
    const searchable = normalizedSearchText([
      cue?.speakerLabel,
      transcriptCuePlainText(cue?.textMarkdown)
    ].join(" "), language);
    if (searchable.includes(query)) cueIndexes.push(cueIndex);
  });
  return { query, cueIndexes };
}

export function mountTranscriptSearch({
  root,
  text,
  getCues,
  getLanguage = () => "en",
  onOpenCue,
  formatError = (error) => error?.message || String(error)
}) {
  const section = root?.querySelector("[data-podcast-transcript-search]");
  const form = root?.querySelector(
    "[data-podcast-transcript-search-form]"
  );
  const input = root?.querySelector(
    "[data-podcast-transcript-search-input]"
  );
  const previous = root?.querySelector(
    "[data-podcast-transcript-search-previous]"
  );
  const next = root?.querySelector(
    "[data-podcast-transcript-search-next]"
  );
  const status = root?.querySelector(
    "[data-podcast-transcript-search-status]"
  );
  if (
    !section
    || !form
    || !input
    || !previous
    || !next
    || !status
  ) return emptyController();

  let available = false;
  let contextKey = "";
  let cueIndexes = [];
  let currentCueIndex = null;

  const clearResults = ({ clearStatus = true } = {}) => {
    cueIndexes = [];
    currentCueIndex = null;
    previous.disabled = true;
    next.disabled = true;
    if (clearStatus) report(status, "");
  };

  const open = (direction = "first") => {
    if (!available) return;
    try {
      const result = findTranscriptCueMatches(
        getCues(),
        input.value,
        getLanguage()
      );
      cueIndexes = result.cueIndexes;
      if (!cueIndexes.length) {
        currentCueIndex = null;
        previous.disabled = true;
        next.disabled = true;
        report(status, text("transcriptSearchNoMatches"));
        return;
      }

      let position = 0;
      if (direction === "previous" && currentCueIndex !== null) {
        let candidate = -1;
        for (let index = cueIndexes.length - 1; index >= 0; index -= 1) {
          if (cueIndexes[index] >= currentCueIndex) continue;
          candidate = index;
          break;
        }
        position = candidate >= 0 ? candidate : 0;
      } else if (direction === "next" && currentCueIndex !== null) {
        const candidate = cueIndexes.findIndex(
          (cueIndex) => cueIndex > currentCueIndex
        );
        position = candidate >= 0 ? candidate : cueIndexes.length - 1;
      }

      currentCueIndex = cueIndexes[position];
      previous.disabled = position === 0;
      next.disabled = position === cueIndexes.length - 1;
      report(status, text("transcriptSearchResult", {
        current: localizedNumber(position + 1),
        total: localizedNumber(cueIndexes.length),
        cue: localizedNumber(currentCueIndex + 1)
      }));
      onOpenCue(currentCueIndex);
    } catch (error) {
      clearResults({ clearStatus: false });
      report(
        status,
        error instanceof TranscriptSearchError
          ? text(searchErrorKey(error.code))
          : formatError(error),
        true
      );
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    currentCueIndex = null;
    open("first");
  });
  previous.addEventListener("click", () => open("previous"));
  next.addEventListener("click", () => open("next"));
  input.addEventListener("input", () => clearResults());

  clearResults();
  return {
    reset() {
      input.value = "";
      clearResults();
    },
    setState({
      available: nextAvailable = false,
      contextKey: nextContextKey = ""
    } = {}) {
      const normalizedContext = String(nextContextKey || "");
      if (!nextAvailable || normalizedContext !== contextKey) {
        input.value = "";
        clearResults();
      }
      available = nextAvailable === true;
      contextKey = normalizedContext;
      section.hidden = !available;
      input.disabled = !available;
      if (!available) {
        previous.disabled = true;
        next.disabled = true;
      }
    }
  };
}

function normalizedSearchText(value, language) {
  const locale = ["en", "es"].includes(language) ? language : "en";
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase(locale);
}

function searchErrorKey(code) {
  return {
    transcript_search_query_required: "transcriptSearchQueryRequired",
    transcript_search_query_too_long: "transcriptSearchQueryTooLong",
    transcript_search_too_many_cues: "transcriptSearchTooManyCues"
  }[code] || "transcriptSearchFailed";
}

function report(status, message, error = false) {
  status.textContent = message;
  status.classList.toggle("is-error", error);
}

function emptyController() {
  return {
    reset() {},
    setState() {}
  };
}
