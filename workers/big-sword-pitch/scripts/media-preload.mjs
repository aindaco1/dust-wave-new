// Serialized into the private standalone player by prepare.mjs.
// A small, tab-local cache avoids downloading a prefetched asset twice even
// though authenticated responses deliberately remain Cache-Control: no-store.
export function installMediaPreloader(slides) {
  const entries = new Map();
  let current = -1;
  let timer;
  const absolute = path => new URL(path, document.baseURI).href;
  const release = (url, entry) => {
    entry.controller.abort();
    if (entry.blob) URL.revokeObjectURL(entry.blob);
    entries.delete(url);
  };
  window.__pitchMedia = {
    source(path) {
      const url = absolute(path);
      const entry = entries.get(url);
      if (entry?.blob) return entry.blob;
      // On a fast jump, let the media element stream immediately instead of
      // waiting for the entire prefetch or competing with a duplicate request.
      if (entry) release(url, entry);
      return path;
    },
    warm(index) {
      if (index === current || index < 0) return;
      current = index;
      clearTimeout(timer);
      const retained = new Set(slides.slice(Math.max(0, index - 1), index + 2).flat().map(absolute));
      for (const [url, entry] of entries) if (!retained.has(url)) release(url, entry);
      timer = setTimeout(async () => {
        const queue = (slides[index + 1] || []).map(absolute).filter(url => !entries.has(url));
        const next = async () => {
          while (queue.length && current === index) {
            const url = queue.shift();
            const entry = { controller: new AbortController(), blob: null };
            entries.set(url, entry);
            try {
              const response = await fetch(url, { credentials: 'same-origin', signal: entry.controller.signal });
              if (!response.ok) throw new Error('Media prefetch unavailable');
              const blob = await response.blob();
              if (entries.get(url) === entry) entry.blob = URL.createObjectURL(blob);
            } catch {
              if (entries.get(url) === entry) release(url, entry);
              // The normal authenticated media URL remains the fallback.
            }
          }
        };
        await Promise.all([next(), next()]);
      }, 300);
    },
  };
  addEventListener('pagehide', () => {
    clearTimeout(timer);
    for (const [url, entry] of entries) release(url, entry);
  });
}
