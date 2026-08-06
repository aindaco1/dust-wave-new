export function mountEpisodeContext({
  select,
  controls = [],
  beforeChange = () => true,
  onChange = () => {}
}) {
  if (!select?.ownerDocument) {
    throw new TypeError("A current-episode selector is required");
  }
  const mirrors = [...new Set(controls)].filter(
    (control) => control?.addEventListener && control !== select
  );
  const listeners = new Map();
  const container = select.closest("[data-podcast-episode-context]");
  let episodeIds = new Set();
  let currentEpisodeId = "";

  function hasOption(control, episodeId) {
    return Array.from(control.options || []).some(
      ({ value }) => String(value) === episodeId
    );
  }

  function syncControl(control, episodeId) {
    if (hasOption(control, episodeId)) control.value = episodeId;
  }

  function sync() {
    syncControl(select, currentEpisodeId);
    mirrors.forEach((control) => syncControl(control, currentEpisodeId));
  }

  function apply(episodeId, source, { notify = true } = {}) {
    const normalized = String(episodeId || "");
    if (!episodeIds.has(normalized)) {
      syncControl(source, currentEpisodeId);
      return false;
    }
    const previousEpisodeId = currentEpisodeId;
    if (
      previousEpisodeId
      && normalized !== previousEpisodeId
      && beforeChange({ episodeId: normalized, previousEpisodeId }) === false
    ) {
      syncControl(source, previousEpisodeId);
      return false;
    }
    currentEpisodeId = normalized;
    sync();
    if (notify && normalized !== previousEpisodeId) {
      onChange({ episodeId: normalized, previousEpisodeId, source });
    }
    return true;
  }

  function listen(control) {
    const listener = (event) => {
      if (apply(control.value, control)) return;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    };
    control.addEventListener("change", listener);
    listeners.set(control, listener);
  }

  listen(select);
  mirrors.forEach((control) => {
    const label = control.closest?.("label");
    if (label) label.hidden = true;
    listen(control);
  });

  return Object.freeze({
    currentEpisodeId: () => currentEpisodeId,
    destroy() {
      for (const [control, listener] of listeners) {
        control.removeEventListener?.("change", listener);
      }
    },
    selectEpisode(episodeId, options) {
      return apply(episodeId, select, options);
    },
    setEpisodes(episodes) {
      const normalized = Array.from(episodes || []).map((episode) => ({
        id: String(episode?.id || ""),
        title: String(episode?.title || ""),
        toolLabel: [episode?.title, episode?.mediaStatus]
          .filter(Boolean)
          .join(" — ")
      })).filter(({ id }) => id);
      episodeIds = new Set(normalized.map(({ id }) => id));
      const previous = episodeIds.has(currentEpisodeId)
        ? currentEpisodeId
        : episodeIds.has(select.value)
          ? select.value
          : normalized[0]?.id || "";
      select.replaceChildren(...normalized.map(({ id, title }) => {
        const option = select.ownerDocument.createElement("option");
        option.value = id;
        option.textContent = title;
        return option;
      }));
      for (const mirror of mirrors) {
        mirror.replaceChildren(...normalized.map(({ id, toolLabel }) => {
          const option = select.ownerDocument.createElement("option");
          option.value = id;
          option.textContent = toolLabel;
          return option;
        }));
      }
      currentEpisodeId = String(previous || "");
      if (container) container.hidden = normalized.length === 0;
      sync();
    },
    sync
  });
}
