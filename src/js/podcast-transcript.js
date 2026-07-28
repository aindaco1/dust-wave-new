"use strict";

/* Approved, public Podcast transcript projection for canonical News pages. */
(() => {
  const roots = Array.from(
    document.querySelectorAll("[data-podcast-transcript]")
  );
  if (!roots.length) return;

  const translate = window.DustWaveI18n?.t || ((key) => key);
  const labels = {
    tabs: translate("transcript.tabs"),
    playFrom: translate("transcript.playFrom"),
    unavailable: translate("transcript.unavailable")
  };
  const LANGUAGE_NAMES = { es: "Español", en: "English" };
  const SAFE_TEXT = /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]*$/;

  for (const root of roots) loadTranscript(root);

  async function loadTranscript(root) {
    const status = root.querySelector("[data-podcast-transcript-status]");
    const content = root.querySelector("[data-podcast-transcript-content]");
    if (!status || !content) return;

    try {
      const endpoint = safeEndpoint(root.dataset.endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      let response;
      try {
        response = await fetch(endpoint, {
          method: "GET",
          headers: { accept: "application/json" },
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error("Transcript is unavailable");
      const raw = await response.text();
      if (raw.length > 2_200_000) {
        throw new Error("Transcript response is too large");
      }
      const payload = validatePayload(JSON.parse(raw));
      if (!payload.transcripts.length) return;

      renderTranscripts(
        content,
        payload.transcripts,
        root.dataset.playerId || "",
        labels
      );
      status.hidden = true;
      content.hidden = false;
      root.dataset.state = "ready";
    } catch {
      status.textContent = labels.unavailable;
      root.dataset.state = "unavailable";
    }
  }

  function renderTranscripts(container, transcripts, playerId, labels) {
    const tabs = document.createElement("div");
    tabs.className = "podcast-transcript__tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", labels.tabs);
    const panels = document.createElement("div");
    panels.className = "podcast-transcript__panels";
    const tabButtons = [];
    const panelElements = [];

    transcripts.forEach((transcript, index) => {
      const tabId = `transcript-tab-${playerId}-${transcript.language}`;
      const panelId = `transcript-panel-${playerId}-${transcript.language}`;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "podcast-transcript__tab";
      tab.id = tabId;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.setAttribute("aria-selected", index === 0 ? "true" : "false");
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.textContent = LANGUAGE_NAMES[transcript.language];

      const panel = document.createElement("section");
      panel.className = "podcast-transcript__panel";
      panel.id = panelId;
      panel.lang = transcript.language;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = index !== 0;
      panel.append(renderCueList(transcript, playerId, labels));

      tab.addEventListener("click", () => activateTab(index));
      tab.addEventListener("keydown", (event) => {
        let targetIndex = index;
        if (event.key === "ArrowRight") {
          targetIndex = (index + 1) % transcripts.length;
        } else if (event.key === "ArrowLeft") {
          targetIndex = (index - 1 + transcripts.length) % transcripts.length;
        } else if (event.key === "Home") {
          targetIndex = 0;
        } else if (event.key === "End") {
          targetIndex = transcripts.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        activateTab(targetIndex, true);
      });
      tabButtons.push(tab);
      panelElements.push(panel);
      tabs.append(tab);
      panels.append(panel);
    });

    container.append(tabs, panels);

    function activateTab(index, focus = false) {
      tabButtons.forEach((candidate, candidateIndex) => {
        const selected = candidateIndex === index;
        candidate.setAttribute("aria-selected", selected ? "true" : "false");
        candidate.tabIndex = selected ? 0 : -1;
        panelElements[candidateIndex].hidden = !selected;
      });
      if (focus) tabButtons[index].focus();
    }
  }

  function renderCueList(transcript, playerId, labels) {
    const list = document.createElement("ol");
    list.className = "podcast-transcript__cues";
    for (const cue of transcript.cues) {
      const item = document.createElement("li");
      item.className = "podcast-transcript__cue";
      const timestamp = document.createElement("button");
      const readableTime = formatTimestamp(cue.startsAtMs);
      timestamp.type = "button";
      timestamp.className = "podcast-transcript__timestamp";
      timestamp.textContent = readableTime;
      timestamp.setAttribute(
        "aria-label",
        `${labels.playFrom} ${readableTime}`
      );
      timestamp.addEventListener("click", () => {
        window.DWDigestAudio?.seekTo(
          playerId,
          cue.startsAtMs / 1_000,
          { play: true }
        );
      });

      const words = document.createElement("p");
      words.className = "podcast-transcript__words";
      if (cue.speakerLabel) {
        const speaker = document.createElement("strong");
        speaker.className = "podcast-transcript__speaker";
        speaker.textContent = `${cue.speakerLabel}: `;
        words.append(speaker);
      }
      words.append(document.createTextNode(cue.text));
      item.append(timestamp, words);
      list.append(item);
    }
    return list;
  }

  function validatePayload(value) {
    if (
      !value
      || typeof value !== "object"
      || value.schemaVersion !== 1
      || !Array.isArray(value.transcripts)
      || value.transcripts.length > 2
    ) {
      throw new Error("Invalid transcript response");
    }
    const languages = new Set();
    const transcripts = value.transcripts.map((transcript) => {
      if (
        !transcript
        || typeof transcript !== "object"
        || !["en", "es"].includes(transcript.language)
        || languages.has(transcript.language)
        || !Number.isSafeInteger(transcript.revision)
        || transcript.revision < 1
        || !/^[0-9a-f]{64}$/.test(transcript.contentSha256)
        || !Array.isArray(transcript.cues)
        || transcript.cues.length < 1
        || transcript.cues.length > 10_000
      ) {
        throw new Error("Invalid transcript revision");
      }
      languages.add(transcript.language);
      let previousEnd = 0;
      const identifiers = new Set();
      const cues = transcript.cues.map((cue) => {
        if (
          !cue
          || typeof cue !== "object"
          || typeof cue.id !== "string"
          || !/^[A-Za-z0-9_-]{1,160}$/.test(cue.id)
          || identifiers.has(cue.id)
          || !Number.isSafeInteger(cue.startsAtMs)
          || !Number.isSafeInteger(cue.endsAtMs)
          || cue.startsAtMs < previousEnd
          || cue.endsAtMs <= cue.startsAtMs
          || cue.endsAtMs > 86_400_000
          || typeof cue.speakerLabel !== "string"
          || cue.speakerLabel.length > 80
          || !SAFE_TEXT.test(cue.speakerLabel)
          || typeof cue.text !== "string"
          || cue.text.length < 1
          || cue.text.length > 2_000
          || !SAFE_TEXT.test(cue.text)
        ) {
          throw new Error("Invalid transcript cue");
        }
        identifiers.add(cue.id);
        previousEnd = cue.endsAtMs;
        return cue;
      });
      return {
        language: transcript.language,
        revision: transcript.revision,
        contentSha256: transcript.contentSha256,
        cues
      };
    });
    return { transcripts };
  }

  function safeEndpoint(value) {
    const url = new URL(String(value || ""), window.location.origin);
    const localDevelopment = ["localhost", "127.0.0.1"].includes(url.hostname);
    const firstParty = url.hostname === "feeds.dustwave.xyz"
      || url.origin === window.location.origin;
    if (
      (url.protocol !== "https:" && !localDevelopment)
      || (!firstParty && !localDevelopment)
    ) {
      throw new Error("Invalid transcript endpoint");
    }
    return url.href;
  }

  function formatTimestamp(milliseconds) {
    const seconds = Math.floor(milliseconds / 1_000);
    const hours = Math.floor(seconds / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    const remainder = seconds % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
      : `${minutes}:${String(remainder).padStart(2, "0")}`;
  }
})();
