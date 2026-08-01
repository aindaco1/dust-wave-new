import assert from "node:assert/strict";
import test from "node:test";

import {
  handleEpisodeYouTubeApproval,
  handleEpisodeYouTubeSubmit
} from "../src/js/podcast-admin-episode-youtube.js";
import {
  buildEpisodeYouTubeDraftRequest,
  buildEpisodeYouTubeReconciliationRequest
} from "../src/js/podcast-admin-episode-youtube-requests.js";

test("builds the exact immutable unlisted episode draft request", () => {
  assert.deepEqual(buildEpisodeYouTubeDraftRequest({
    episodeId: "episode_fixture",
    publicationId: "episode_youtube_fixture",
    publicationRevision: "4",
    title: "  Ópera en la Selva  ",
    description: "  Description  ",
    privacyStatus: "unlisted",
    confirmChannelUrl: "  https://youtube.com/@dustwavecollective  "
  }), {
    path: "/v1/admin/episodes/episode_fixture/youtube",
    options: {
      method: "POST",
      body: {
        publicationId: "episode_youtube_fixture",
        expectedPublicationRevision: 4,
        title: "Ópera en la Selva",
        description: "Description",
        privacyStatus: "unlisted",
        confirmChannelUrl: "https://youtube.com/@dustwavecollective"
      }
    }
  });
});

test("fails closed on malformed or non-unlisted episode drafts", () => {
  const draft = {
    episodeId: "episode_fixture",
    publicationId: "episode_youtube_fixture",
    publicationRevision: 4,
    title: "Episode title",
    description: "Description",
    privacyStatus: "unlisted",
    confirmChannelUrl: "https://youtube.com/@dustwavecollective"
  };
  for (const change of [
    { episodeId: "unsafe/path" },
    { publicationId: "" },
    { publicationRevision: 0 },
    { privacyStatus: "private" },
    { title: "unsafe\u0000title" },
    { description: "unsafe\u0001description" },
    { confirmChannelUrl: "" }
  ]) {
    assert.equal(
      buildEpisodeYouTubeDraftRequest({ ...draft, ...change }),
      null
    );
  }
});

test("binds reconciliation evidence to the selected outcome", () => {
  assert.deepEqual(buildEpisodeYouTubeReconciliationRequest({
    publicationId: "episode_youtube_fixture",
    outcome: "uploaded",
    providerVideoId: " video_12345 ",
    confirmed: true
  }), {
    request: {
      path: "/v1/admin/episode-youtube-publications/episode_youtube_fixture/reconcile",
      options: {
        method: "POST",
        body: {
          outcome: "uploaded",
          providerVideoId: "video_12345",
          confirmation: "CONFIRM_VERIFIED_UNLISTED_VIDEO"
        }
      }
    }
  });
  assert.deepEqual(buildEpisodeYouTubeReconciliationRequest({
    publicationId: "episode_youtube_fixture",
    outcome: "not_uploaded",
    providerVideoId: "stale_provider_id",
    confirmed: true
  }).request.options.body, {
    outcome: "not_uploaded",
    providerVideoId: "",
    confirmation: "CONFIRM_NO_CHANNEL_VIDEO_REMAINS"
  });
});

test("rejects incomplete or tampered reconciliation evidence", () => {
  assert.deepEqual(buildEpisodeYouTubeReconciliationRequest({
    publicationId: "episode_youtube_fixture",
    outcome: "uploaded",
    providerVideoId: "video_12345",
    confirmed: false
  }), { error: "confirmation_required" });
  assert.deepEqual(buildEpisodeYouTubeReconciliationRequest({
    publicationId: "episode_youtube_fixture",
    outcome: "uploaded",
    providerVideoId: "bad/id",
    confirmed: true
  }), { error: "provider_id_required" });
  assert.deepEqual(buildEpisodeYouTubeReconciliationRequest({
    publicationId: "episode_youtube_fixture",
    outcome: "tampered",
    providerVideoId: "video_12345",
    confirmed: true
  }), { error: "invalid" });
});

test("submits an idempotent draft and always restores the action", async () => {
  const state = submitFixture({ idempotent: true });

  await handleEpisodeYouTubeSubmit(state.arguments);

  assert.equal(state.prevented, true);
  assert.equal(state.button.disabled, false);
  assert.deepEqual(state.requests, [{
    path: "/v1/admin/episodes/episode_fixture/youtube",
    options: {
      method: "POST",
      body: {
        publicationId: "episode_youtube_fixture",
        expectedPublicationRevision: 4,
        title: "Episode title",
        description: "Description",
        privacyStatus: "unlisted",
        confirmChannelUrl: "https://youtube.com/@dustwavecollective"
      }
    }
  }]);
  assert.deepEqual(state.loaded, ["episode_fixture"]);
  assert.deepEqual(state.statuses.at(-1), {
    message: "youtubeDraftExists",
    error: false
  });
});

test("blocks unauthorized, invalid, and failed draft submissions safely", async () => {
  const unauthorized = submitFixture();
  unauthorized.arguments.canPrepare = false;
  await handleEpisodeYouTubeSubmit(unauthorized.arguments);
  assert.equal(unauthorized.prevented, true);
  assert.deepEqual(unauthorized.requests, []);

  const invalid = submitFixture();
  invalid.form.elements.privacyStatus.value = "private";
  await handleEpisodeYouTubeSubmit(invalid.arguments);
  assert.deepEqual(invalid.requests, []);
  assert.equal(invalid.button.disabled, false);
  assert.deepEqual(invalid.statuses.at(-1), {
    message: "episodeYoutubeDraftInvalid",
    error: true
  });

  const failed = submitFixture({ requestError: new Error("network") });
  await handleEpisodeYouTubeSubmit(failed.arguments);
  assert.equal(failed.button.disabled, false);
  assert.deepEqual(failed.loaded, []);
  assert.deepEqual(failed.statuses.at(-1), {
    message: "friendly:network",
    error: true
  });
});

test("submits only authorized, exact reconciliation evidence", async () => {
  const state = reconciliationFixture();
  await handleEpisodeYouTubeSubmit(state.arguments);
  assert.equal(state.button.disabled, false);
  assert.deepEqual(state.requests, [{
    path: "/v1/admin/episode-youtube-publications/episode_youtube_fixture/reconcile",
    options: {
      method: "POST",
      body: {
        outcome: "uploaded",
        providerVideoId: "video_12345",
        confirmation: "CONFIRM_VERIFIED_UNLISTED_VIDEO"
      }
    }
  }]);
  assert.deepEqual(state.loaded, ["episode_fixture"]);

  const unauthorized = reconciliationFixture();
  unauthorized.arguments.canReconcile = false;
  await handleEpisodeYouTubeSubmit(unauthorized.arguments);
  assert.deepEqual(unauthorized.requests, []);

  const tampered = reconciliationFixture();
  tampered.form.elements.outcome.value = "tampered";
  await handleEpisodeYouTubeSubmit(tampered.arguments);
  assert.deepEqual(tampered.requests, []);
  assert.equal(tampered.button.disabled, false);
  assert.deepEqual(tampered.statuses.at(-1), {
    message: "episodeYoutubeReconcileInvalid",
    error: true
  });
});

test("approval honors confirmation and restores its button after success", async () => {
  const originalWindow = globalThis.window;
  const requests = [];
  const loaded = [];
  const statuses = [];
  const button = {
    disabled: false,
    dataset: {
      podcastEpisodeYoutubeApprove: "episode_youtube_fixture",
      episodeId: "episode_fixture"
    },
    parentElement: { querySelector: () => ({}) }
  };
  const argumentsFixture = {
    button,
    authorized: true,
    client: {
      async request(path, options) {
        requests.push({ path, options });
      }
    },
    text: (key) => key,
    setStatus(_node, message, error = false) {
      statuses.push({ message, error });
    },
    friendlyError: (error) => `friendly:${error.message}`,
    async loadDistribution(episodeId) {
      loaded.push(episodeId);
    }
  };
  try {
    globalThis.window = { confirm: () => false };
    await handleEpisodeYouTubeApproval(argumentsFixture);
    assert.deepEqual(requests, []);

    globalThis.window.confirm = () => true;
    await handleEpisodeYouTubeApproval(argumentsFixture);
    assert.equal(button.disabled, false);
    assert.deepEqual(requests, [{
      path: "/v1/admin/episode-youtube-publications/episode_youtube_fixture/approve",
      options: { method: "POST", body: {} }
    }]);
    assert.deepEqual(loaded, ["episode_fixture"]);
    assert.deepEqual(statuses[0], {
      message: "approvingYoutubeTest",
      error: false
    });
  } finally {
    globalThis.window = originalWindow;
  }
});

function submitFixture({ idempotent = false, requestError = null } = {}) {
  const button = { disabled: false };
  const status = {};
  const requests = [];
  const loaded = [];
  const statuses = [];
  const form = {
    dataset: {
      episodeId: "episode_fixture",
      publicationId: "episode_youtube_fixture",
      publicationRevision: "4"
    },
    elements: {
      title: { value: "Episode title" },
      description: { value: "Description" },
      privacyStatus: { value: "unlisted" },
      confirmChannelUrl: {
        value: "https://youtube.com/@dustwavecollective"
      }
    },
    reportValidity: () => true,
    querySelector(selector) {
      return selector === 'button[type="submit"]' ? button : status;
    }
  };
  const state = {
    button,
    form,
    loaded,
    prevented: false,
    requests,
    statuses
  };
  state.arguments = {
    event: {
      target: {
        closest(selector) {
          return selector === "[data-podcast-episode-youtube-form]"
            ? form
            : null;
        }
      },
      preventDefault() {
        state.prevented = true;
      }
    },
    canPrepare: true,
    canReconcile: false,
    client: {
      async request(path, options) {
        requests.push({ path, options });
        if (requestError) throw requestError;
        return { idempotent };
      }
    },
    text: (key) => key,
    setStatus(_node, message, error = false) {
      statuses.push({ message, error });
    },
    friendlyError: (error) => `friendly:${error.message}`,
    async loadDistribution(episodeId) {
      loaded.push(episodeId);
    }
  };
  return state;
}

function reconciliationFixture() {
  const button = { disabled: false };
  const status = {};
  const requests = [];
  const loaded = [];
  const statuses = [];
  const form = {
    dataset: {
      episodeId: "episode_fixture",
      publicationId: "episode_youtube_fixture"
    },
    elements: {
      outcome: { value: "uploaded" },
      providerVideoId: { value: "video_12345" },
      confirmation: { checked: true }
    },
    reportValidity: () => true,
    querySelector(selector) {
      return selector === 'button[type="submit"]' ? button : status;
    }
  };
  const state = { button, form, loaded, requests, statuses };
  state.arguments = {
    event: {
      target: {
        closest(selector) {
          return selector === "[data-podcast-episode-youtube-reconcile]"
            ? form
            : null;
        }
      },
      preventDefault() {}
    },
    canPrepare: false,
    canReconcile: true,
    client: {
      async request(path, options) {
        requests.push({ path, options });
      }
    },
    text: (key) => key,
    setStatus(_node, message, error = false) {
      statuses.push({ message, error });
    },
    friendlyError: (error) => `friendly:${error.message}`,
    async loadDistribution(episodeId) {
      loaded.push(episodeId);
    }
  };
  return state;
}
