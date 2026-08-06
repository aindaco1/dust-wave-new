const TAB_GROUPS = Object.freeze({
  episodes: ["production"],
  audience: ["analytics", "subscribers"],
  monetization: ["sponsors", "billing"]
});

export function mountPodcastAdminWorkspaces({ root, loaders = {} }) {
  if (!root?.querySelectorAll) {
    throw new TypeError("A Podcast Admin workspace root is required");
  }
  const groups = Array.from(
    root.querySelectorAll("[data-podcast-workspace-group]")
  );
  const listeners = new Map();

  function nameOf(group) {
    return String(group.dataset.podcastWorkspaceGroup || "");
  }

  function sync(group, { load = true } = {}) {
    const state = group.querySelector("[data-podcast-workspace-state]");
    if (state) state.textContent = group.open ? "−" : "+";
    if (load && group.open) loaders[nameOf(group)]?.();
  }

  for (const group of groups) {
    const listener = () => sync(group);
    listeners.set(group, listener);
    group.addEventListener("toggle", listener);
    sync(group, { load: false });
  }

  return {
    groups,
    isOpen(name) {
      return groups.some((group) => nameOf(group) === name && group.open);
    },
    loadTab(name) {
      for (const groupName of TAB_GROUPS[name] || []) {
        const group = groups.find(
          (candidate) => nameOf(candidate) === groupName
        );
        if (group?.open) loaders[groupName]?.();
      }
    },
    destroy() {
      for (const [group, listener] of listeners) {
        group.removeEventListener("toggle", listener);
      }
    }
  };
}
