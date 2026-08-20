export function canCreatePodcastShow(identity) {
  return (identity?.roles || []).some(({ role }) => role === "super_admin");
}

export function showSlugFromTitle(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120)
    .replace(/-+$/gu, "");
}

export function showCreationConfirmation(slug) {
  return `CREATE_SHOW ${String(slug || "").trim()}`;
}

export function permanentShowDestinations(slugValue) {
  const slug = String(slugValue || "").trim();
  if (!slug) return { canonicalUrl: "", feedUrl: "" };
  return {
    canonicalUrl: `https://dustwave.xyz/podcasts/${slug}/`,
    feedUrl: `https://feeds.dustwave.xyz/${slug}/rss.xml`
  };
}

export function readShowCreationPayload(form, requestId) {
  const earlyAccessValue = String(
    form.elements.earlyAccessDays.value ?? ""
  ).trim();
  return {
    requestId,
    title: form.elements.title.value,
    slug: form.elements.slug.value,
    language: form.elements.language.value,
    authorName: form.elements.authorName.value,
    category: form.elements.category.value,
    description: form.elements.description.value,
    descriptionEn: form.elements.descriptionEn.value,
    artworkUrl: form.elements.artworkUrl.value,
    earlyAccessDays: earlyAccessValue === ""
      ? null
      : Number(earlyAccessValue),
    youtubeChannelUrl: form.elements.youtubeChannelUrl.value,
    explicit: form.elements.explicit.checked,
    confirmation: form.elements.confirmation.value
  };
}

export function mountPodcastShowCreator({
  root,
  client,
  text,
  setStatus,
  friendlyError,
  onCreated
}) {
  const toggle = root.querySelector("[data-podcast-show-create-toggle]");
  const panel = root.querySelector("[data-podcast-show-create-panel]");
  const form = root.querySelector("[data-podcast-show-create-form]");
  const cancel = root.querySelector("[data-podcast-show-create-cancel]");
  const status = root.querySelector("[data-podcast-show-create-status]");
  const confirmationValue = root.querySelector(
    "[data-podcast-show-create-confirmation]"
  );
  let identity = null;
  let requestId = "";
  let slugManuallyEdited = false;

  function updateIdentityPreview() {
    if (!form) return;
    const slug = form.elements.slug.value;
    const destinations = permanentShowDestinations(slug);
    form.elements.canonicalUrl.value = destinations.canonicalUrl;
    form.elements.feedUrl.value = destinations.feedUrl;
    if (confirmationValue) {
      confirmationValue.textContent = showCreationConfirmation(slug);
    }
  }

  function resetForm(close = false) {
    form?.reset();
    requestId = "";
    slugManuallyEdited = false;
    if (form?.elements.language) {
      form.elements.language.value =
        root.ownerDocument.documentElement.lang === "en" ? "en" : "es";
    }
    updateIdentityPreview();
    setStatus(status, "");
    if (close && panel) {
      panel.hidden = true;
      toggle?.setAttribute("aria-expanded", "false");
    }
  }

  function togglePanel() {
    if (!canCreatePodcastShow(identity) || !panel) return;
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle?.setAttribute("aria-expanded", String(opening));
    if (opening) {
      updateIdentityPreview();
      form?.elements.title?.focus();
    }
  }

  async function create(event) {
    event.preventDefault();
    if (!canCreatePodcastShow(identity) || !form) return;
    const confirmation = showCreationConfirmation(form.elements.slug.value);
    if (form.elements.confirmation.value !== confirmation) {
      setStatus(status, text("showCreateConfirmationMismatch"), true);
      form.elements.confirmation.focus();
      return;
    }
    if (!requestId) {
      requestId = `show_create_${crypto.randomUUID().replaceAll("-", "")}`;
    }
    const payload = readShowCreationPayload(form, requestId);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, text("creatingShow"));
    try {
      const result = await client.request("/v1/admin/shows", {
        method: "POST",
        body: payload
      });
      await onCreated(result.show);
      setStatus(status, text("showCreated", { title: result.show.title }));
      form.reset();
      requestId = "";
      slugManuallyEdited = false;
      if (form.elements.language) {
        form.elements.language.value =
          root.ownerDocument.documentElement.lang === "en" ? "en" : "es";
      }
      updateIdentityPreview();
    } catch (error) {
      setStatus(status, friendlyError(error), true);
    } finally {
      button.disabled = false;
    }
  }

  toggle?.addEventListener("click", togglePanel);
  cancel?.addEventListener("click", () => resetForm(true));
  form?.addEventListener("submit", create);
  form?.addEventListener("input", () => {
    requestId = "";
  });
  form?.elements.title?.addEventListener("input", () => {
    if (!slugManuallyEdited) {
      form.elements.slug.value = showSlugFromTitle(form.elements.title.value);
    }
    updateIdentityPreview();
  });
  form?.elements.slug?.addEventListener("input", () => {
    slugManuallyEdited = true;
    updateIdentityPreview();
  });
  resetForm(true);

  return Object.freeze({
    setIdentity(nextIdentity) {
      identity = nextIdentity || null;
      const allowed = canCreatePodcastShow(identity);
      if (toggle) toggle.hidden = !allowed;
      if (!allowed) resetForm(true);
    },
    reset() {
      identity = null;
      if (toggle) toggle.hidden = true;
      resetForm(true);
    }
  });
}
