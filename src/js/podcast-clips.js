"use strict";

/* Approved captioned clips for the canonical Podcast News page. */
(() => {
  const roots = Array.from(
    document.querySelectorAll("[data-podcast-clips]")
  );
  if (!roots.length) return;

  const translate = window.DustWaveI18n?.t || ((key) => key);
  const labels = {
    video: translate("clips.video"),
    duration: translate("clips.duration"),
    captions: translate("clips.captions"),
    download: translate("clips.download"),
    share: translate("clips.share"),
    copy: translate("clips.copy"),
    copied: translate("clips.copied"),
    selected: translate("clips.selected")
  };
  const SAFE_TEXT =
    /^[^\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]*$/;
  const ASPECTS = {
    "9:16": { width: 1080, height: 1920, css: "9 / 16" },
    "1:1": { width: 1080, height: 1080, css: "1 / 1" },
    "16:9": { width: 1920, height: 1080, css: "16 / 9" }
  };
  const LANGUAGE_NAMES = { es: "Español", en: "English" };

  for (const root of roots) loadClips(root);

  async function loadClips(root) {
    const status = root.querySelector("[data-podcast-clips-status]");
    const content = root.querySelector("[data-podcast-clips-content]");
    if (!status || !content) return;

    try {
      const showSlug = validSlug(root.dataset.showSlug);
      const episodeSlug = validSlug(root.dataset.episodeSlug);
      const endpoint = safeEndpoint(
        root.dataset.endpoint,
        showSlug,
        episodeSlug
      );
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
      if (!response.ok) {
        concealClips(root, status, content);
        root.dataset.state = response.status === 404
          ? "empty"
          : "unavailable";
        return;
      }
      const raw = await response.text();
      if (raw.length > 100_000) {
        throw new Error("Clip response is too large");
      }
      const payload = validatePayload(
        JSON.parse(raw),
        endpoint,
        showSlug,
        episodeSlug
      );
      if (!payload.clips.length) {
        concealClips(root, status, content);
        root.dataset.state = "empty";
        return;
      }
      renderClips(content, payload.clips, labels);
      status.hidden = true;
      content.hidden = false;
      root.hidden = false;
      root.dataset.state = "ready";
    } catch {
      concealClips(root, status, content);
      root.dataset.state = "unavailable";
    }
  }

  function concealClips(root, status, content) {
    content.replaceChildren();
    content.hidden = true;
    status.hidden = false;
    root.hidden = true;
  }

  function renderClips(container, clips, labels) {
    const grid = document.createElement("div");
    grid.className = "podcast-clips__grid";
    for (const clip of clips) {
      const card = document.createElement("article");
      card.className = "podcast-clips__card";
      card.id = `clip-${clip.slug}`;

      const video = document.createElement("video");
      video.className = "podcast-clips__video";
      video.controls = true;
      video.preload = "none";
      video.playsInline = true;
      video.width = clip.width;
      video.height = clip.height;
      video.src = clip.mediaUrl;
      video.setAttribute(
        "aria-label",
        interpolate(labels.video, { title: clip.title })
      );
      video.style.setProperty(
        "--podcast-clip-aspect",
        ASPECTS[clip.aspectRatio].css
      );

      const body = document.createElement("div");
      body.className = "podcast-clips__body";
      const title = document.createElement("h3");
      title.className = "podcast-clips__title";
      title.textContent = clip.title;
      body.append(title);
      if (clip.description) {
        const description = document.createElement("p");
        description.className = "podcast-clips__description";
        description.textContent = clip.description;
        body.append(description);
      }
      const metadata = document.createElement("p");
      metadata.className = "podcast-clips__meta";
      metadata.textContent = [
        interpolate(labels.duration, {
          duration: formatDuration(clip.durationMs)
        }),
        interpolate(labels.captions, {
          language: LANGUAGE_NAMES[clip.captionLanguage]
        }),
        clip.aspectRatio
      ].join(" · ");
      body.append(metadata);

      const actions = document.createElement("div");
      actions.className = "podcast-clips__actions";
      const download = document.createElement("a");
      download.className = "podcast-clips__action";
      download.href = clip.downloadUrl;
      download.download = `${clip.slug}.mp4`;
      download.referrerPolicy = "no-referrer";
      download.textContent = labels.download;
      actions.append(download);

      const shareUrl = `${clip.canonicalUrl}#clip-${clip.slug}`;
      if (typeof navigator.share === "function") {
        const share = actionButton(labels.share);
        share.addEventListener("click", async () => {
          try {
            await navigator.share({
              title: clip.title,
              text: clip.description,
              url: shareUrl
            });
          } catch {
            // A canceled share sheet is not an error state for the page.
          }
        });
        actions.append(share);
      }

      const copy = actionButton(labels.copy);
      const manualCopy = document.createElement("input");
      manualCopy.className = "podcast-clips__copy-input";
      manualCopy.type = "text";
      manualCopy.value = shareUrl;
      manualCopy.readOnly = true;
      manualCopy.hidden = true;
      const copyStatus = document.createElement("p");
      copyStatus.className = "podcast-clips__copy-status";
      copyStatus.setAttribute("aria-live", "polite");
      copyStatus.hidden = true;
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          manualCopy.hidden = true;
          copyStatus.textContent = labels.copied;
        } catch {
          manualCopy.hidden = false;
          manualCopy.focus();
          manualCopy.select();
          copyStatus.textContent = labels.selected;
        }
        copyStatus.hidden = false;
      });
      actions.append(copy, manualCopy, copyStatus);
      body.append(actions);
      card.append(video, body);
      grid.append(card);
    }
    container.replaceChildren(grid);
  }

  function validatePayload(
    value,
    endpoint,
    showSlug,
    episodeSlug
  ) {
    if (
      !value
      || typeof value !== "object"
      || value.schemaVersion !== 1
      || typeof value.truncated !== "boolean"
      || !value.episode
      || value.episode.showSlug !== showSlug
      || value.episode.slug !== episodeSlug
      || !Array.isArray(value.clips)
      || value.clips.length > 24
    ) {
      throw new Error("Invalid clip response");
    }
    const canonicalUrl = safeCanonicalUrl(
      value.episode.canonicalUrl,
      showSlug,
      episodeSlug
    );
    const slugs = new Set();
    const clips = value.clips.map((candidate) => {
      if (!candidate || typeof candidate !== "object") {
        throw new Error("Invalid clip");
      }
      const slug = validSlug(candidate.slug);
      const aspect = ASPECTS[candidate.aspectRatio];
      if (
        slugs.has(slug)
        || !aspect
        || candidate.width !== aspect.width
        || candidate.height !== aspect.height
        || !Number.isSafeInteger(candidate.durationMs)
        || candidate.durationMs < 1_000
        || candidate.durationMs > 180_000
        || !["en", "es"].includes(candidate.captionLanguage)
        || candidate.canonicalUrl !== canonicalUrl
      ) {
        throw new Error("Invalid clip evidence");
      }
      slugs.add(slug);
      const mediaOrigin = endpoint.hostname === "feeds.dustwave.xyz"
        ? "https://media.dustwave.xyz"
        : endpoint.origin;
      const expectedMedia = new URL(
        `${endpoint.pathname}/${slug}.mp4`,
        mediaOrigin
      );
      const expectedDownload = new URL(expectedMedia);
      expectedDownload.searchParams.set("download", "1");
      if (
        candidate.mediaUrl !== expectedMedia.href
        || candidate.downloadUrl !== expectedDownload.href
      ) {
        throw new Error("Invalid clip media URL");
      }
      return {
        slug,
        title: safeText(candidate.title, 160, false),
        description: safeText(candidate.description, 1_000, true),
        aspectRatio: candidate.aspectRatio,
        width: candidate.width,
        height: candidate.height,
        durationMs: candidate.durationMs,
        captionLanguage: candidate.captionLanguage,
        mediaUrl: expectedMedia.href,
        downloadUrl: expectedDownload.href,
        canonicalUrl
      };
    });
    return { clips };
  }

  function safeEndpoint(value, showSlug, episodeSlug) {
    const url = new URL(String(value || ""), document.baseURI);
    const local = ["localhost", "127.0.0.1"].includes(url.hostname);
    const firstParty = url.origin === location.origin
      || url.hostname === "feeds.dustwave.xyz"
      || url.hostname === "dust-wave-podcast-staging.jogo.workers.dev";
    if (
      url.username
      || url.password
      || url.search
      || url.hash
      || (url.protocol !== "https:" && !(local && url.protocol === "http:"))
      || (!firstParty && !local)
      || url.pathname !==
        `/v1/shows/${showSlug}/episodes/${episodeSlug}/clips`
    ) {
      throw new Error("Unsafe clip endpoint");
    }
    return url;
  }

  function safeCanonicalUrl(value, showSlug, episodeSlug) {
    const url = new URL(String(value || ""));
    if (
      url.origin !== "https://dustwave.xyz"
      || url.username
      || url.password
      || url.search
      || url.hash
      || url.pathname !==
        `/news/podcasts/${showSlug}/${episodeSlug}/`
    ) {
      throw new Error("Invalid canonical clip URL");
    }
    return url.href;
  }

  function safeText(value, maximumLength, allowEmpty) {
    if (typeof value !== "string") throw new Error("Invalid clip text");
    const text = value.normalize("NFKC").trim();
    if (
      (!allowEmpty && !text)
      || text.length > maximumLength
      || !SAFE_TEXT.test(text)
    ) {
      throw new Error("Invalid clip text");
    }
    return text;
  }

  function validSlug(value) {
    const slug = String(value || "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("Invalid clip slug");
    }
    return slug;
  }

  function actionButton(text) {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "podcast-clips__action podcast-clips__action--secondary";
    button.textContent = text;
    return button;
  }

  function interpolate(value, variables) {
    return Object.entries(variables).reduce(
      (result, [key, replacement]) =>
        result.replaceAll(`%{${key}}`, String(replacement)),
      value
    );
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(1, Math.round(milliseconds / 1_000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes > 0
      ? `${minutes}:${String(remainder).padStart(2, "0")}`
      : `0:${String(remainder).padStart(2, "0")}`;
  }
})();
