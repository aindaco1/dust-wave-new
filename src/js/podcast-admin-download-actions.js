export function clipDownloadActionMarkup(urls, text) {
  return urls
    .map((url, index) => [
      url,
      ["downloadMp4", "downloadVtt", "downloadSrt"][index]
    ])
    .filter(([url]) => url)
    .map(([url, label]) => `
      <a
        class="btn btn-outline-light"
        href="${escapeMarkup(url)}"
        download>
        ${escapeMarkup(text(label))}
      </a>`)
    .join("");
}

export function mountTranscriptDownloads(root, text) {
  const container = root.querySelector("[data-podcast-transcript-downloads]");
  const apiOrigin = root.dataset.apiOrigin;

  function render(episodeId, transcript) {
    if (!container) return;
    container.replaceChildren();
    const language = transcript?.language;
    const revision = Number(transcript?.revision || 0);
    if (
      !/^[A-Za-z0-9_-]+$/.test(episodeId || "")
      || !["en", "es"].includes(language)
      || revision < 1
      || !Array.isArray(transcript?.cues)
      || transcript.cues.length < 1
    ) {
      container.hidden = true;
      return;
    }
    const links = [
      ["vtt", "downloadSavedVtt"],
      ["srt", "downloadSavedSrt"]
    ].map(([format, label]) => {
      const link = document.createElement("a");
      link.className = "btn btn-outline-light";
      link.href = transcriptCaptionUrl(
        apiOrigin,
        episodeId,
        language,
        format
      );
      link.setAttribute("download", "");
      link.textContent = text(label);
      return link;
    });
    container.replaceChildren(...links);
    container.hidden = false;
  }

  return { render };
}

function transcriptCaptionUrl(apiOrigin, episodeId, language, format) {
  const base = new URL(`${String(apiOrigin || "").replace(/\/+$/, "")}/`);
  const path = `/v1/admin/episodes/${encodeURIComponent(episodeId)}`
    + `/transcripts/${language}/captions.${format}`;
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw new Error("Invalid transcript URL");
  return url.toString();
}

function escapeMarkup(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
