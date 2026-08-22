const DEFAULT_STORAGE_KEY = "dustwave-podcast-admin-show-v1";

export function createPodcastShowSelection(
  storageProvider,
  storageKey = DEFAULT_STORAGE_KEY
) {
  const storage = () => {
    try {
      return typeof storageProvider === "function"
        ? storageProvider()
        : storageProvider;
    } catch {
      return null;
    }
  };

  return Object.freeze({
    read(shows) {
      let remembered = "";
      try {
        remembered = String(storage()?.getItem(storageKey) || "");
      } catch {
        return "";
      }
      return Array.from(shows || []).some(
        ({ id }) => String(id) === remembered
      ) ? remembered : "";
    },
    remember(showId) {
      const id = String(showId || "");
      try {
        if (id) storage()?.setItem(storageKey, id);
        else storage()?.removeItem(storageKey);
      } catch {
        return false;
      }
      return Boolean(id);
    }
  });
}
