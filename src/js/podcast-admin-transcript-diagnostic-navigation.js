import {
  resolveTranscriptDiagnosticPosition,
  stepTranscriptDiagnosticPosition,
  summarizeTranscriptReview,
  transcriptReviewDiagnosticItems
} from "./podcast-admin-transcript-review.js";

const navigationStateProperty = "__podcastTranscriptDiagnosticState";

export function renderTranscriptReviewDiagnostics(
  container,
  cues,
  text,
  onOpenCue
) {
  const diagnostics = container?.querySelector(
    "[data-podcast-transcript-diagnostics]"
  );
  const summaryRoot = container?.querySelector(
    "[data-podcast-transcript-diagnostics-summary]"
  );
  const listRoot = container?.querySelector(
    "[data-podcast-transcript-diagnostics-list]"
  );
  if (!diagnostics || !summaryRoot || !listRoot) return;

  const summary = summarizeTranscriptReview(cues);
  const items = transcriptReviewDiagnosticItems(summary, text);
  const state = diagnostics[navigationStateProperty] instanceof Map
    ? diagnostics[navigationStateProperty]
    : new Map();
  diagnostics[navigationStateProperty] = state;
  diagnostics.hidden = false;
  summaryRoot.textContent = text("transcriptDiagnosticsSummary", {
    cues: localizedNumber(summary.cueCount),
    signals: localizedNumber(summary.reviewCueCount)
  });

  if (!items.length) {
    state.clear();
    const message = document.createElement("li");
    message.className = "podcast-admin__transcript-diagnostic-empty";
    message.textContent = text("transcriptDiagnosticsClear");
    listRoot.replaceChildren(message);
    return;
  }

  const currentKeys = new Set(items.map(({ key }) => key));
  for (const key of state.keys()) {
    if (!currentKeys.has(key)) state.delete(key);
  }
  listRoot.replaceChildren(
    ...items.map((item) =>
      diagnosticNavigator(item, state, text, onOpenCue)
    )
  );
}

export function clearTranscriptReviewDiagnostics(container) {
  const diagnostics = container?.querySelector(
    "[data-podcast-transcript-diagnostics]"
  );
  if (diagnostics) {
    diagnostics.hidden = true;
    diagnostics[navigationStateProperty]?.clear?.();
  }
  container?.querySelector(
    "[data-podcast-transcript-diagnostics-summary]"
  )?.replaceChildren();
  container?.querySelector(
    "[data-podcast-transcript-diagnostics-list]"
  )?.replaceChildren();
}

function diagnosticNavigator(item, state, text, onOpenCue) {
  const listItem = document.createElement("li");
  listItem.className = "podcast-admin__transcript-diagnostic";
  listItem.dataset.podcastTranscriptDiagnostic = item.key;
  const message = document.createElement("p");
  const messageId = `podcast-transcript-diagnostic-${item.key}`;
  message.id = messageId;
  message.className = "podcast-admin__transcript-diagnostic-message";
  message.textContent = item.label;
  const controls = document.createElement("div");
  controls.className = "podcast-admin__transcript-diagnostic-controls";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-labelledby", messageId);
  const previous = navigationButton(
    "previous",
    "←",
    text("transcriptDiagnosticPrevious")
  );
  const open = navigationButton("open", "", "");
  const next = navigationButton(
    "next",
    "→",
    text("transcriptDiagnosticNext")
  );
  let position = resolveTranscriptDiagnosticPosition(
    item.cueIndexes,
    state.get(item.key)
  );

  const update = () => {
    const cueIndex = item.cueIndexes[position];
    state.set(item.key, cueIndex);
    previous.disabled = position <= 0;
    next.disabled = position >= item.cueIndexes.length - 1;
    open.replaceChildren(
      textSpan(
        "podcast-admin__transcript-diagnostic-action",
        text("transcriptDiagnosticOpenCue", {
          number: localizedNumber(cueIndex + 1)
        })
      ),
      textSpan(
        "podcast-admin__transcript-diagnostic-position",
        text("transcriptDiagnosticPosition", {
          current: localizedNumber(position + 1),
          total: localizedNumber(item.cueIndexes.length)
        })
      )
    );
    open.setAttribute(
      "aria-label",
      text("transcriptDiagnosticOpenCuePosition", {
        number: localizedNumber(cueIndex + 1),
        current: localizedNumber(position + 1),
        total: localizedNumber(item.cueIndexes.length)
      })
    );
    return cueIndex;
  };
  const move = (direction) => {
    position = stepTranscriptDiagnosticPosition(
      item.cueIndexes,
      position,
      direction
    );
    onOpenCue(update());
  };

  previous.addEventListener("click", () => move(-1));
  open.addEventListener("click", () => onOpenCue(update()));
  next.addEventListener("click", () => move(1));
  update();
  controls.append(previous, open, next);
  listItem.append(message, controls);
  return listItem;
}

function navigationButton(action, visibleText, label) {
  const button = document.createElement("button");
  button.className =
    `podcast-admin__transcript-diagnostic-button `
    + `podcast-admin__transcript-diagnostic-button--${action}`;
  button.dataset.podcastTranscriptDiagnosticAction = action;
  button.type = "button";
  button.setAttribute("aria-controls", "podcast-transcript-cues");
  if (label) button.setAttribute("aria-label", label);
  button.textContent = visibleText;
  return button;
}

function textSpan(className, value) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = value;
  return span;
}

function localizedNumber(value) {
  return new Intl.NumberFormat(
    globalThis.document?.documentElement?.lang || "en"
  ).format(Number(value || 0));
}
