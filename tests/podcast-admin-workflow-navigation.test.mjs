import assert from "node:assert/strict";
import test from "node:test";

import {
  createEpisodeWorkflowNavigator
} from "../src/js/podcast-admin-workflow-navigation.js";

function fixture() {
  let focused = false;
  const document = {
    defaultView: {
      Event: class {
        constructor(type) { this.type = type; }
      },
      getComputedStyle: () => ({ display: "block", visibility: "visible" }),
      setTimeout(callback) {
        callback();
        return 1;
      }
    }
  };
  const uploadControl = {
    ownerDocument: document,
    value: "",
    dispatchEvent() {},
    closest() { return uploadForm; }
  };
  const focusTarget = {
    disabled: false,
    hidden: false,
    closest() { return null; },
    focus() { focused = true; }
  };
  const uploadForm = {
    closest() { return null; },
    matches() { return false; },
    querySelectorAll() { return [focusTarget]; }
  };
  const root = {
    ownerDocument: document,
    querySelector(selector) {
      if (selector === "[data-podcast-upload-form]") return uploadForm;
      if (selector === "[data-podcast-upload-form] [name=episodeId]") {
        return uploadControl;
      }
      return null;
    }
  };
  return {
    root,
    uploadControl,
    wasFocused: () => focused
  };
}

test("workflow tabs retain menu focus while explicit blocker links focus tools", () => {
  const { root, uploadControl, wasFocused } = fixture();
  const selectedTabs = [];
  const selectedSections = [];
  const navigate = createEpisodeWorkflowNavigator({
    root,
    tabs: { select: (value) => selectedTabs.push(value) },
    audioQcEpisodeSelect: uploadControl,
    audioMasterEpisodeSelect: null,
    transcriptEpisodeSelect: null,
    chapterEpisodeSelect: null,
    reviewEpisodeSelect: null,
    loadProductionReviews() {},
    loadPublicationReadiness() {},
    publishSections: { select: (value) => selectedSections.push(value) }
  });
  const episode = { id: "episode_1", mediaStatus: "pending" };

  navigate("media", episode);
  assert.equal(wasFocused(), false, "Selecting a tab must not steal focus");
  assert.equal(uploadControl.value, "episode_1");
  assert.deepEqual(selectedTabs, ["episodes"]);
  assert.deepEqual(selectedSections, ["media"]);

  navigate("media", episode, "attach_media");
  assert.equal(wasFocused(), true, "A blocker link focuses its exact repair tool");
});
