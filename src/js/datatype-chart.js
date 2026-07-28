export const DATATYPE_FONT_SHORTHAND = '500 1em "Dust Wave Datatype"';
export const DATATYPE_FONT_PROBE = "{l:0,100}";

const MAX_DATATYPE_VALUES = 20;

export function normalizeDatatypeValues(values, maximum) {
  assertSeries(values);
  const upperBound = Number(maximum);
  if (!Number.isFinite(upperBound) || upperBound <= 0) {
    throw new RangeError("Datatype normalization requires a positive maximum.");
  }

  return values.map((value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      throw new TypeError(
        "Datatype chart values must be finite, non-negative numbers."
      );
    }
    return Math.round(Math.min(numericValue / upperBound, 1) * 100);
  });
}

export function encodeDatatypeLine(values) {
  assertSeries(values);
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      throw new RangeError(
        "Datatype line values must be integers from 0 through 100."
      );
    }
  }
  return `{l:${values.join(",")}}`;
}

export async function waitForDatatypeFont(
  fontSet = globalThis.document?.fonts
) {
  if (
    !fontSet
    || typeof fontSet.load !== "function"
    || typeof fontSet.check !== "function"
  ) {
    return false;
  }

  try {
    const faces = await fontSet.load(
      DATATYPE_FONT_SHORTHAND,
      DATATYPE_FONT_PROBE
    );
    return faces.length > 0
      && fontSet.check(DATATYPE_FONT_SHORTHAND, DATATYPE_FONT_PROBE);
  } catch {
    return false;
  }
}

export function createDatatypeTrendSummary({
  note,
  series,
  maximum,
  documentRef = globalThis.document
}) {
  const summary = documentRef.createElement("section");
  summary.className = "podcast-admin__datatype-summary";
  summary.dataset.datatypeAnalytics = "";
  summary.hidden = true;

  const noteElement = documentRef.createElement("p");
  noteElement.className = "podcast-admin__datatype-note";
  noteElement.textContent = note;

  const cards = documentRef.createElement("div");
  cards.className = "podcast-admin__datatype-cards";
  for (const item of series) {
    const card = documentRef.createElement("article");
    card.className = `podcast-admin__datatype-card ${item.className}`;
    const heading = documentRef.createElement("h4");
    heading.textContent = item.label;
    const latest = documentRef.createElement("p");
    latest.className = "podcast-admin__datatype-latest";
    latest.textContent = item.latest;
    const chart = documentRef.createElement("span");
    chart.className = "podcast-admin__datatype-chart";
    chart.dir = "ltr";
    chart.setAttribute("aria-hidden", "true");
    chart.textContent = encodeDatatypeLine(
      normalizeDatatypeValues(item.values, maximum)
    );
    card.append(heading, latest, chart);
    cards.append(card);
  }

  summary.append(noteElement, cards);
  waitForDatatypeFont(documentRef.fonts).then((ready) => {
    if (ready && summary.isConnected) {
      summary.hidden = false;
    }
  });
  return summary;
}

function assertSeries(values) {
  if (!Array.isArray(values) || values.length < 1) {
    throw new TypeError("Datatype charts require at least one value.");
  }
  if (values.length > MAX_DATATYPE_VALUES) {
    throw new RangeError(
      `Datatype charts support at most ${MAX_DATATYPE_VALUES} values.`
    );
  }
}
