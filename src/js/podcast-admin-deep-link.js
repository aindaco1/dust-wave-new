const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const PARAMETERS = ["show", "episode", "step", "target"];
const STEP_TARGETS = Object.freeze({
  details: new Set(),
  media: new Set(["attach_media", "working_master", "delivery_audio"]),
  transcript: new Set(["alignment", "chapters"]),
  review: new Set(["production_review", "promotion_clips"]),
  monetization: new Set(),
  publish: new Set()
});

export function parsePodcastAdminDeepLink(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    return null;
  }
  const showId = url.searchParams.get("show") || "";
  const episodeId = url.searchParams.get("episode") || "";
  const step = url.searchParams.get("step") || "";
  const target = url.searchParams.get("target") || "";
  const targets = STEP_TARGETS[step];
  if (
    !IDENTIFIER.test(showId)
    || !IDENTIFIER.test(episodeId)
    || !targets
    || (target && !targets.has(target))
  ) return null;
  return Object.freeze({ showId, episodeId, step, target });
}

export function clearPodcastAdminDeepLink(location, history) {
  if (!location?.href || !history?.replaceState) return false;
  let url;
  try {
    url = new URL(location.href);
  } catch {
    return false;
  }
  if (!PARAMETERS.some((name) => url.searchParams.has(name))) return false;
  for (const name of PARAMETERS) url.searchParams.delete(name);
  history.replaceState(
    history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
  return true;
}

export default function mountPodcastAdminDeepLink({ location, history }) {
  let pending = parsePodcastAdminDeepLink(location?.href);
  const clear = () => {
    pending = null;
    clearPodcastAdminDeepLink(location, history);
  };
  return Object.freeze({
    selectShowId(shows, currentShowId) {
      const available = Array.from(shows || []);
      const requestedShowId = pending?.showId || "";
      if (available.some(({ id }) => id === requestedShowId)) {
        return requestedShowId;
      }
      if (pending) clear();
      return available.some(({ id }) => id === currentShowId)
        ? currentShowId
        : available[0]?.id || "";
    },
    navigate(showId, episodes, selectEpisode, navigate) {
      if (!pending || pending.showId !== showId) return false;
      const deepLink = pending;
      const episode = Array.from(episodes || [])
        .find(({ id }) => id === deepLink.episodeId);
      clear();
      if (
        !episode
        || typeof selectEpisode !== "function"
        || !selectEpisode(episode.id)
        || typeof navigate !== "function"
      ) return false;
      navigate(deepLink.step, episode, deepLink.target);
      return true;
    }
  });
}
