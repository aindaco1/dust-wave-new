import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPodcastAdminDeepLink,
  parsePodcastAdminDeepLink
} from "../src/js/podcast-admin-deep-link.js";
import mountPodcastAdminDeepLink from "../src/js/podcast-admin-deep-link.js";
import {
  createEpisodeWorkflowNavigator
} from "../src/js/podcast-admin-workflow-controller.js";

test("parses one allowlisted episode workflow target", () => {
  assert.deepEqual(
    parsePodcastAdminDeepLink(
      "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1&step=media&target=working_master"
    ),
    {
      showId: "opera",
      episodeId: "episode_1",
      step: "media",
      target: "working_master"
    }
  );
});

test("accepts a step without an exact target", () => {
  assert.deepEqual(
    parsePodcastAdminDeepLink(
      "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1&step=publish"
    ),
    {
      showId: "opera",
      episodeId: "episode_1",
      step: "publish",
      target: ""
    }
  );
});

test("accepts the transcript review action target", () => {
  assert.deepEqual(
    parsePodcastAdminDeepLink(
      "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1&step=transcript&target=transcript_review"
    ),
    {
      showId: "opera",
      episodeId: "episode_1",
      step: "transcript",
      target: "transcript_review"
    }
  );
});

test("rejects unknown, mismatched, and unbounded input", () => {
  const base = "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1";
  assert.equal(parsePodcastAdminDeepLink(`${base}&step=unknown`), null);
  assert.equal(
    parsePodcastAdminDeepLink(`${base}&step=transcript&target=working_master`),
    null
  );
  assert.equal(
    parsePodcastAdminDeepLink(
      `${base}&step=media&target=${"a".repeat(129)}`
    ),
    null
  );
  assert.equal(
    parsePodcastAdminDeepLink(
      "https://dustwave.xyz/admin/podcasts/?show=../opera&episode=episode_1&step=media"
    ),
    null
  );
});

test("clears only podcast navigation parameters after use", () => {
  const calls = [];
  const location = {
    href: "https://dustwave.xyz/admin/podcasts/?language=es&show=opera&episode=episode_1&step=review&target=production_review#kept"
  };
  const history = {
    state: { retained: true },
    replaceState(...args) { calls.push(args); }
  };
  assert.equal(clearPodcastAdminDeepLink(location, history), true);
  assert.deepEqual(calls, [[
    history.state,
    "",
    "/admin/podcasts/?language=es#kept"
  ]]);
});

test("controller selects and consumes an authorized episode once", () => {
  const calls = [];
  const location = {
    href: "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1&step=media&target=working_master"
  };
  const history = {
    state: null,
    replaceState(...args) { calls.push(args); }
  };
  const controller = mountPodcastAdminDeepLink({
    location,
    history
  });
  assert.equal(
    controller.selectShowId([{ id: "other" }, { id: "opera" }], "other"),
    "opera"
  );
  const navigations = [];
  assert.equal(controller.navigate(
    "opera",
    [{ id: "episode_1", title: "Episode" }],
    () => true,
    (...args) => navigations.push(args)
  ), true);
  assert.equal(navigations.length, 1);
  assert.deepEqual(navigations[0], [
    "media",
    { id: "episode_1", title: "Episode" },
    "working_master"
  ]);
  assert.equal(controller.navigate("opera", [], () => true, () => {}), false);
  assert.equal(calls.length, 1);
});

test("workflow controller reuses the navigator for a deep link", () => {
  const selectedTabs = [];
  const defaultView = {
    location: {
      href: "https://dustwave.xyz/admin/podcasts/?show=opera&episode=episode_1&step=publish"
    },
    history: { state: null, replaceState() {} },
    CSS: { escape: (value) => value },
    setTimeout: (callback) => callback(),
    matchMedia: () => ({ matches: true }),
    getComputedStyle: () => ({ display: "block", visibility: "visible" })
  };
  const navigate = createEpisodeWorkflowNavigator({
    root: {
      ownerDocument: { defaultView },
      querySelector: () => null
    },
    tabs: { select: (tab) => selectedTabs.push(tab) }
  });
  assert.equal(navigate.selectLinkedShow([{ id: "opera" }], ""), "opera");
  assert.equal(
    navigate.openDeepLink("opera", [{ id: "episode_1" }], () => true),
    true
  );
  assert.deepEqual(selectedTabs, ["episodes"]);
});
