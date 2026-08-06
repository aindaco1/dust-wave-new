export function createPublicationReadinessLoader({
  client,
  summary,
  groups,
  status,
  text,
  setStatus,
  friendlyError,
  selectedEpisodeId,
  onReadiness
}) {
  let requestId = 0;
  let pending = null;

  return async function loadPublicationReadiness(episodeId) {
    const requestedEpisodeId = episodeId === undefined
      ? selectedEpisodeId?.()
      : episodeId;
    const normalizedEpisodeId = String(requestedEpisodeId || "");
    if (normalizedEpisodeId && pending?.episodeId === normalizedEpisodeId) {
      return pending.promise;
    }
    const promise = (async () => {
      const currentRequest = ++requestId;
      onReadiness(null);
      groups?.replaceChildren();
      if (!normalizedEpisodeId) {
        if (summary) summary.textContent = text("createBeforeReadiness");
        setStatus(status, "");
        return null;
      }
      setStatus(status, text("loadingReadiness"));
      try {
        const payload = await client.request(
          `/v1/admin/episodes/${encodeURIComponent(
            normalizedEpisodeId
          )}/readiness`
        );
        if (currentRequest !== requestId) return null;
        onReadiness(payload);
        setStatus(status, "");
        return payload;
      } catch (error) {
        if (currentRequest !== requestId) return null;
        if (summary) summary.textContent = text("readinessFailed");
        setStatus(status, friendlyError(error), true);
        return null;
      }
    })();
    if (normalizedEpisodeId) {
      pending = { episodeId: normalizedEpisodeId, promise };
    }
    try {
      return await promise;
    } finally {
      if (pending?.promise === promise) pending = null;
    }
  };
}
