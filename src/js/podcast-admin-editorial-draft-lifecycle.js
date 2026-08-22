export function createEditorialDraftLifecycle({
  getContextKey,
  onBusyChange = () => {}
}) {
  if (typeof getContextKey !== "function") {
    throw new TypeError("Editorial draft context is required");
  }

  let revision = 0;
  const busy = { generating: false, loading: false };

  function isCurrent(requestRevision, contextKey) {
    return requestRevision === revision && contextKey === getContextKey();
  }

  return {
    isBusy(kind) {
      return Boolean(busy[kind]);
    },

    invalidate() {
      revision += 1;
      busy.generating = false;
      busy.loading = false;
      onBusyChange();
    },

    async run(kind, {
      before = () => {},
      request,
      onSuccess = () => {},
      onError = () => {}
    }) {
      if (!(kind in busy)) throw new TypeError("Unknown editorial draft operation");
      if (busy[kind] || typeof request !== "function") return false;

      busy[kind] = true;
      const requestRevision = ++revision;
      const contextKey = getContextKey();
      before();
      onBusyChange();
      try {
        const value = await request(contextKey);
        if (!isCurrent(requestRevision, contextKey)) return false;
        await onSuccess(value);
        return true;
      } catch (error) {
        if (isCurrent(requestRevision, contextKey)) await onError(error);
        return false;
      } finally {
        if (requestRevision === revision) busy[kind] = false;
        onBusyChange();
      }
    }
  };
}

export function preferredEditorialDraft(
  drafts,
  sourceLanguage,
  outputLanguage
) {
  const values = Array.isArray(drafts) ? drafts : [];
  return values.find((candidate) =>
    candidate.source.language === sourceLanguage
    && candidate.outputLanguage === outputLanguage
  ) || values.find((candidate) =>
    candidate.outputLanguage === outputLanguage
  ) || values[0] || null;
}
