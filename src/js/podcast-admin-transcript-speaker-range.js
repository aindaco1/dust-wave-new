import {
  applyTranscriptSpeakerRange
} from "./podcast-admin-transcript-review.js";
import { formatLocalizedNumber as localizedNumber } from
  "./podcast-admin-formatters.js";

const root = document.querySelector("[data-podcast-admin]");
if (root) mountTranscriptSpeakerRange(root);

export function mountTranscriptSpeakerRange(adminRoot) {
  const form = adminRoot.querySelector(
    "[data-podcast-transcript-speaker-range]"
  );
  const cuesRoot = adminRoot.querySelector(
    "[data-podcast-transcript-cues]"
  );
  const status = adminRoot.querySelector(
    "[data-podcast-transcript-status]"
  );
  if (!form || !cuesRoot) return null;

  const startInput = form.querySelector(
    "[data-podcast-transcript-speaker-range-start]"
  );
  const endInput = form.querySelector(
    "[data-podcast-transcript-speaker-range-end]"
  );
  const labelInput = form.querySelector(
    "[data-podcast-transcript-speaker-range-label]"
  );
  const confirmedInput = form.querySelector(
    "[data-podcast-transcript-speaker-range-confirmed]"
  );

  function render() {
    const rows = cueRows(cuesRoot);
    const editable = rows.length > 0
      && rows.every((row) =>
        row.querySelector("[data-transcript-speaker]")?.disabled === false
      );
    form.hidden = !editable;
    if (!editable) {
      form.dataset.pageIdentity = "";
      return;
    }
    const firstCue = cueNumber(rows[0]);
    const lastCue = cueNumber(rows.at(-1));
    const pageIdentity = [
      rows[0].dataset.transcriptCueId,
      rows.at(-1).dataset.transcriptCueId,
      firstCue,
      lastCue
    ].join(":");
    for (const input of [startInput, endInput]) {
      input.min = String(firstCue);
      input.max = String(lastCue);
    }
    if (form.dataset.pageIdentity !== pageIdentity) {
      form.dataset.pageIdentity = pageIdentity;
      startInput.value = String(firstCue);
      endInput.value = String(lastCue);
      labelInput.value = "";
      confirmedInput.checked = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const rows = cueRows(cuesRoot);
    if (!rows.length) return;
    const firstCue = cueNumber(rows[0]);
    const lastCue = cueNumber(rows.at(-1));
    const requestedStart = Number(startInput.value);
    const requestedEnd = Number(endInput.value);
    if (
      !Number.isSafeInteger(requestedStart)
      || !Number.isSafeInteger(requestedEnd)
      || requestedStart < firstCue
      || requestedEnd > lastCue
    ) {
      report(status, text("speakerRangeInvalid"), true);
      return;
    }
    const result = applyTranscriptSpeakerRange(
      rows.map((row) => ({
        speakerLabel:
          row.querySelector("[data-transcript-speaker]")?.value || "",
        speakerConfirmed:
          row.querySelector(
            "[data-transcript-speaker-confirmed]"
          )?.checked === true
      })),
      {
        startCue: requestedStart - firstCue + 1,
        endCue: requestedEnd - firstCue + 1,
        speakerLabel: labelInput.value,
        speakerConfirmed: confirmedInput.checked
      }
    );
    if (!result.ok) {
      const key = result.error === "speaker_range_label_required"
        ? "speakerRangeLabelRequired"
        : result.error === "speaker_range_label_invalid"
          ? "speakerRangeLabelInvalid"
          : "speakerRangeInvalid";
      report(status, text(key), true);
      return;
    }

    rows.slice(result.startCue - 1, result.endCue).forEach(
      (row, index) => {
        const cue = result.cues[result.startCue - 1 + index];
        const speaker = row.querySelector("[data-transcript-speaker]");
        const confirmed = row.querySelector(
          "[data-transcript-speaker-confirmed]"
        );
        if (speaker.value !== cue.speakerLabel) {
          speaker.value = cue.speakerLabel;
          speaker.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (confirmed.checked !== cue.speakerConfirmed) {
          confirmed.checked = cue.speakerConfirmed;
          confirmed.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    );
    report(
      status,
      text(
        result.speakerConfirmed
          ? "speakerRangeConfirmedApplied"
          : "speakerRangeApplied",
        {
          speaker: result.speakerLabel,
          count: localizedNumber(result.affectedCueCount)
        }
      )
    );
    rows[result.startCue - 1]
      ?.querySelector("[data-transcript-speaker]")
      ?.focus();
  });

  const observer = new MutationObserver(render);
  observer.observe(cuesRoot, { childList: true });
  render();
  return {
    disconnect() {
      observer.disconnect();
    },
    render
  };
}

function cueRows(cuesRoot) {
  return Array.from(
    cuesRoot.querySelectorAll("[data-transcript-cue-number]")
  );
}

function cueNumber(row) {
  return Number(row?.dataset.transcriptCueNumber);
}

function report(status, message, error = false) {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", error);
}

function text(key, variables = {}) {
  const translated = globalThis.DustWaveI18n?.t(
    `admin.${key}`,
    variables
  );
  return translated && !translated.startsWith("[missing:")
    ? translated
    : `[missing: admin.${key}]`;
}
