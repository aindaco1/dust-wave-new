const EDIT_TYPES = new Set(["show", "episode", "clip"]);

export function createContextualEditButton({
  document,
  type,
  id,
  parentId = "",
  label,
  accessibleLabel = ""
}) {
  if (!document?.createElement || !EDIT_TYPES.has(type) || !id) {
    throw new TypeError("A valid contextual edit target is required");
  }
  const button = document.createElement("button");
  button.className = "btn btn-outline-light";
  button.type = "button";
  button.dataset.podcastContextEdit = type;
  button.dataset.podcastContextId = String(id);
  if (parentId) {
    button.dataset.podcastContextParentId = String(parentId);
  }
  button.textContent = String(label || "");
  if (accessibleLabel) button.setAttribute("aria-label", accessibleLabel);
  return button;
}

export function prependContextualEditButton(container, options) {
  if (!container) return null;
  const button = createContextualEditButton({
    document: container.ownerDocument,
    ...options
  });
  container.prepend(button);
  return button;
}

export function prependClipRecipeEditButton(container, clip, text) {
  return prependContextualEditButton(container, {
    type: "clip",
    id: clip.id,
    parentId: clip.episodeId,
    label: text("editRecipe"),
    accessibleLabel: text("editRecipeLabel", { title: clip.title })
  });
}

export function contextualEditRequest(target, root) {
  const button = target?.closest?.("[data-podcast-context-edit]");
  if (!button || (root?.contains && !root.contains(button))) return null;
  const type = String(button.dataset.podcastContextEdit || "");
  const id = String(button.dataset.podcastContextId || "");
  if (!EDIT_TYPES.has(type) || !id) return null;
  return {
    button,
    type,
    id,
    parentId: String(button.dataset.podcastContextParentId || "")
  };
}

export function revealContextualEditor(container, focusTarget, {
  focus = true,
  scroll = true,
  block = "start",
  behavior
} = {}) {
  if (scroll) {
    const options = { block };
    if (behavior) options.behavior = behavior;
    container?.scrollIntoView?.(options);
  }
  if (focus) {
    focusTarget?.focus?.(scroll ? undefined : { preventScroll: true });
  }
}

export function revealContextualFormField(form, name, options = {}) {
  revealContextualEditor(form, form?.elements?.[name], {
    behavior: "smooth",
    ...options
  });
}

export function applyContextualMarketingLink(form, row, {
  edit = false,
  onChange = () => {}
} = {}) {
  if (!form) return;
  for (const [field, key] of Object.entries({
    label: "label",
    source: "utmSource",
    medium: "utmMedium",
    campaign: "utmCampaign",
    content: "utmContent",
    ref: "referralCode"
  })) {
    form.elements[field].value = String(row?.[key] || "");
  }
  onChange();
  if (edit) revealContextualFormField(form, "label");
}

export function renderContextualAnalyticsEpisodes({
  target,
  rows,
  text,
  formatInteger,
  canEdit,
  table,
  empty
}) {
  if (!target) return;
  if (!rows.length) {
    target.replaceChildren(empty(text("analyticsNoEpisodes")));
    return;
  }
  target.replaceChildren(table(
    [
      text("analyticsEpisode"),
      text("analyticsQualifiedShort"),
      text("analyticsEngagedShort"),
      text("actionsLabel")
    ],
    rows.map((row) => [
      row.title,
      formatInteger(row.qualifiedDownloads),
      formatInteger(row.engagedPlays),
      canEdit() && row.episodeId
        ? createContextualEditButton({
            document: target.ownerDocument,
            type: "episode",
            id: row.episodeId,
            label: text("editEpisode"),
            accessibleLabel: text("editEpisodeLabel", { title: row.title })
          })
        : "—"
    ]),
    text("analyticsTopEpisodes")
  ));
}

export function mountPodcastContextualEditing({ root, handlers = null }) {
  if (!root?.addEventListener) {
    throw new TypeError("A Podcast Admin root is required");
  }
  const activeHandlers = handlers || createPodcastDomContextualEditHandlers(
    root
  );

  async function handleClick(event) {
    const request = contextualEditRequest(event.target, root);
    if (!request) return;
    const handler = activeHandlers[request.type];
    if (typeof handler !== "function") return;
    event.preventDefault?.();
    request.button.disabled = true;
    request.button.setAttribute?.("aria-busy", "true");
    try {
      await handler(request);
    } finally {
      request.button.disabled = false;
      request.button.removeAttribute?.("aria-busy");
    }
  }

  root.addEventListener("click", handleClick);
  return Object.freeze({
    destroy() {
      root.removeEventListener?.("click", handleClick);
    }
  });
}

export function createPodcastDomContextualEditHandlers(root) {
  const query = (selector) => root.querySelector(selector);
  const activateTab = (name) => {
    const tab = query(`[data-podcast-tabs] [data-tab="${name}"]`);
    tab?.click?.();
    return Boolean(tab);
  };
  const select = (control, id) => {
    const exactId = String(id || "");
    if (!Array.from(control?.options || []).some(
      ({ value }) => String(value) === exactId
    )) return false;
    if (String(control.value) === exactId) return true;
    control.value = exactId;
    const EventConstructor = control.ownerDocument?.defaultView?.Event;
    return Boolean(EventConstructor) && control.dispatchEvent(
      new EventConstructor("change", { bubbles: true, cancelable: true })
    );
  };

  function show({ id }) {
    const control = query(
      "#podcast-panel-settings [data-podcast-show-select]"
    );
    if (!select(control, id) || !activateTab("settings")) return false;
    const form = query("[data-podcast-show-form]");
    revealContextualEditor(form, form?.elements?.title, {
      behavior: "smooth"
    });
    return true;
  }

  function episode({ id }) {
    if (!select(query("[data-podcast-current-episode]"), id)) return false;
    activateTab("episodes");
    query('[data-workflow-step="details"]')?.click?.();
    const button = exactButton(root, "editEpisode", id);
    if (!button) return false;
    button.click();
    const form = query("[data-podcast-episode-form]");
    revealContextualEditor(form, form?.elements?.title, {
      behavior: "smooth"
    });
    return true;
  }

  async function clip({ id, parentId }) {
    if (!select(
      query("[data-podcast-current-episode]"),
      parentId
    )) return false;
    activateTab("episodes");
    query('[data-workflow-step="review"]')?.click?.();
    const button = await waitForExactButton(root, "podcastClipEdit", id);
    if (!button) return false;
    openDisclosureAncestors(button);
    button.click();
    const form = query("[data-podcast-clip-form]");
    openDisclosureAncestors(form);
    revealContextualEditor(form, form?.elements?.title, {
      behavior: "smooth",
      block: "nearest"
    });
    return true;
  }

  return Object.freeze({ show, episode, clip });
}

function exactButton(root, key, id) {
  return Array.from(root.querySelectorAll?.(`[data-${datasetAttribute(key)}]`)
    || []).find((button) => String(button.dataset[key] || "") === String(id));
}

function datasetAttribute(key) {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function waitForExactButton(root, key, id, timeoutMs = 10_000) {
  const existing = exactButton(root, key, id);
  if (existing) return Promise.resolve(existing);
  const view = root.ownerDocument?.defaultView;
  const Observer = view?.MutationObserver;
  if (!Observer) return Promise.resolve(null);
  return new Promise((resolve) => {
    const finish = (value) => {
      view.clearTimeout(timer);
      observer.disconnect();
      resolve(value);
    };
    const observer = new Observer(() => {
      const button = exactButton(root, key, id);
      if (button) finish(button);
    });
    const timer = view.setTimeout(() => finish(null), timeoutMs);
    observer.observe(root, { childList: true, subtree: true });
  });
}

function openDisclosureAncestors(element) {
  let disclosure = element?.closest?.("details") || null;
  while (disclosure) {
    disclosure.open = true;
    disclosure = disclosure.parentElement?.closest?.("details") || null;
  }
}

export function createPodcastContextualEditHandlers({
  permissions,
  tabs,
  showSelect,
  getSelectedShowId,
  getShows,
  showForm,
  getEpisodes,
  episodeForm,
  selectEpisode,
  navigateEpisode,
  getClips,
  loadTranscript,
  selectClipRecipe
}) {
  function show({ id }) {
    const shows = getShows();
    const exactId = String(id || "");
    if (!permissions.show() || !shows.some((item) => item.id === exactId)) {
      return false;
    }
    if (exactId !== getSelectedShowId()) {
      const EventConstructor = showSelect?.ownerDocument?.defaultView?.Event;
      if (!EventConstructor) return false;
      showSelect.value = exactId;
      if (!showSelect.dispatchEvent(new EventConstructor("change", {
        bubbles: true,
        cancelable: true
      }))) return false;
    }
    tabs.select("settings");
    revealContextualEditor(showForm, showForm?.elements?.title, {
      behavior: "smooth"
    });
    return true;
  }

  function episode({ id }) {
    if (!permissions.episode()) return false;
    const current = getEpisodes().find((item) => item.id === id);
    if (!current || !selectEpisode(current.id)) return false;
    navigateEpisode("details", current);
    revealContextualEditor(episodeForm, episodeForm?.elements?.title, {
      behavior: "smooth"
    });
    return true;
  }

  async function clip({ id, parentId }) {
    if (!permissions.clip()) return false;
    const source = getClips().find((item) => item.id === id);
    const episodeId = String(parentId || source?.episodeId || "");
    const current = getEpisodes().find((item) => item.id === episodeId);
    if (!source || !current || !selectEpisode(episodeId)) return false;
    navigateEpisode("review", current, "promotion_clips");
    await loadTranscript();
    return selectClipRecipe(id);
  }

  return Object.freeze({ show, episode, clip });
}
