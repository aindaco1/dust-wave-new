import mountPodcastAdminDeepLink from "./podcast-admin-deep-link.js";
import {
  createEpisodeWorkflowNavigator as createNavigator
} from "./podcast-admin-workflow-navigation.js";

export function createEpisodeWorkflowNavigator(options) {
  const navigate = createNavigator(options);
  const deepLink = mountPodcastAdminDeepLink(
    options.root.ownerDocument.defaultView || {}
  );
  navigate.selectLinkedShow = deepLink.selectShowId;
  navigate.openDeepLink = (showId, episodes, selectEpisode) =>
    deepLink.navigate(showId, episodes, selectEpisode, navigate);
  return navigate;
}
