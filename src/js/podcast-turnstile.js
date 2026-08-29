const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function createPodcastTurnstileLoader({
  scope = globalThis,
  document = scope.document
} = {}) {
  let loader;
  return function loadPodcastTurnstile() {
    if (scope.turnstile) return Promise.resolve(scope.turnstile);
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
      if (!document?.head?.append) {
        reject(new Error("turnstile_unavailable"));
        return;
      }
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.referrerPolicy = "no-referrer";
      script.addEventListener("load", () => {
        if (scope.turnstile) resolve(scope.turnstile);
        else reject(new Error("turnstile_unavailable"));
      }, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    }).catch((error) => {
      loader = undefined;
      throw error;
    });
    return loader;
  };
}

const loadDefaultPodcastTurnstile = createPodcastTurnstileLoader();

export function loadPodcastTurnstile() {
  return loadDefaultPodcastTurnstile();
}

export function resetPodcastTurnstile(widgetId, scope = globalThis) {
  if (widgetId !== undefined) scope.turnstile?.reset?.(widgetId);
}
