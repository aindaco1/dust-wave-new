"use strict";

/* Approved Podcasting 2.0 chapters for the existing Digest/Podcast player. */
(() => {
  const roots = Array.from(
    document.querySelectorAll("[data-podcast-chapters]")
  );
  if (!roots.length) return;

  const LABELS = {
    es: {
      playFrom: "Reproducir desde",
      related: "Enlace relacionado",
      unavailable:
        "Los capítulos aprobados aparecerán aquí. / "
        + "Approved chapters will appear here."
    },
    en: {
      playFrom: "Play from",
      related: "Related link",
      unavailable:
        "Approved chapters will appear here. / "
        + "Los capítulos aprobados aparecerán aquí."
    }
  };
  const SAFE_TEXT =
    /^[^\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]*$/;

  for (const root of roots) loadChapters(root);

  async function loadChapters(root) {
    const status = root.querySelector("[data-podcast-chapters-status]");
    const content = root.querySelector("[data-podcast-chapters-content]");
    const language = root.dataset.language === "en" ? "en" : "es";
    const labels = LABELS[language];
    if (!status || !content) return;

    try {
      const endpoint = safeEndpoint(root.dataset.endpoint);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      let response;
      try {
        response = await fetch(endpoint, {
          method: "GET",
          headers: { accept: "application/json+chapters, application/json" },
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error("Chapters are unavailable");
      const raw = await response.text();
      if (raw.length > 300_000) {
        throw new Error("Chapter response is too large");
      }
      const chapters = validateDocument(JSON.parse(raw));
      renderChapters(
        content,
        chapters,
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

  function renderChapters(container, chapters, playerId, labels) {
    const list = document.createElement("ol");
    list.className = "podcast-chapters__list";
    const buttons = [];
    for (const [index, chapter] of chapters.entries()) {
      const item = document.createElement("li");
      item.className = "podcast-chapters__chapter";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "podcast-chapters__jump";
      button.setAttribute(
        "aria-label",
        `${labels.playFrom} ${formatTimestamp(chapter.startTime)}: `
        + chapter.title
      );
      const timestamp = document.createElement("span");
      timestamp.className = "podcast-chapters__timestamp";
      timestamp.textContent = formatTimestamp(chapter.startTime);
      const title = document.createElement("span");
      title.className = "podcast-chapters__title";
      title.textContent = chapter.title;
      button.append(timestamp, title);
      button.addEventListener("click", () => {
        window.DWDigestAudio?.seekTo(playerId, chapter.startTime, {
          play: true
        });
      });
      buttons.push(button);
      item.append(button);
      if (chapter.url) {
        const link = document.createElement("a");
        link.className = "podcast-chapters__link";
        link.href = chapter.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.referrerPolicy = "no-referrer";
        link.textContent = labels.related;
        item.append(link);
      }
      if (chapter.toc !== false) list.append(item);
      if (chapter.toc === false) buttons[index] = null;
    }
    container.replaceChildren(list);
    setActiveChapter(0);

    let attempts = 0;
    const subscribe = () => {
      if (typeof window.DWDigestAudio?.subscribeTime === "function") {
        const unsubscribe = window.DWDigestAudio.subscribeTime(
          playerId,
          setActiveChapter
        );
        window.addEventListener("pagehide", unsubscribe, { once: true });
        return;
      }
      attempts += 1;
      if (attempts < 20) setTimeout(subscribe, 100);
    };
    subscribe();

    function setActiveChapter(seconds) {
      let activeIndex = chapters.findIndex(({ toc }) => toc !== false);
      for (let index = 0; index < chapters.length; index += 1) {
        if (chapters[index].startTime > seconds) break;
        if (chapters[index].toc !== false) activeIndex = index;
      }
      buttons.forEach((button, index) => {
        if (!button) return;
        const active = index === activeIndex;
        button.classList.toggle("is-active", active);
        if (active) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
    }
  }

  function validateDocument(value) {
    if (
      !value
      || typeof value !== "object"
      || value.version !== "1.2.0"
      || !Array.isArray(value.chapters)
      || value.chapters.length < 1
      || value.chapters.length > 500
    ) {
      throw new Error("Invalid chapter document");
    }
    let previousStart = -1;
    return value.chapters.map((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        throw new Error("Invalid chapter");
      }
      const startTime = Number(candidate.startTime);
      const title = String(candidate.title || "").normalize("NFKC").trim();
      if (
        !Number.isFinite(startTime)
        || startTime < 0
        || startTime > 86_400
        || startTime <= previousStart
        || title.length < 1
        || title.length > 160
        || !SAFE_TEXT.test(title)
        || ("toc" in candidate && typeof candidate.toc !== "boolean")
      ) {
        throw new Error("Invalid chapter");
      }
      previousStart = startTime;
      return {
        startTime,
        title,
        url: safeOptionalUrl(candidate.url),
        toc: candidate.toc !== false
      };
    });
  }

  function safeEndpoint(value) {
    const url = new URL(String(value || ""), document.baseURI);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (url.username || url.password) {
      throw new Error("Unsafe chapter endpoint");
    }
    if (
      url.protocol !== "https:"
      && !(local && url.protocol === "http:")
    ) {
      throw new Error("Unsafe chapter endpoint");
    }
    if (
      !local
      && url.origin !== location.origin
      && url.origin !== "https://feeds.dustwave.xyz"
    ) {
      throw new Error("Unsafe chapter endpoint");
    }
    return url.href;
  }

  function safeOptionalUrl(value) {
    if (value === undefined) return "";
    if (typeof value !== "string" || value.length > 2_048) {
      throw new Error("Invalid chapter URL");
    }
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid chapter URL");
    }
    return url.href;
  }

  function formatTimestamp(value) {
    const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${
        String(seconds).padStart(2, "0")
      }`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
})();
