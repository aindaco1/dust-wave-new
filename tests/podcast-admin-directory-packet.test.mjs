import assert from "node:assert/strict";
import test from "node:test";

import {
  createDirectorySubmissionPacketActions,
  createDistributionFeedActions,
  isDirectorySubmissionPacket
} from "../src/js/podcast-admin-directory-packet.js";

test("accepts only the versioned credential-free packet contract", () => {
  const packet = {
    schema: "dust-wave-directory-submission-packet",
    version: 1,
    containsCredentials: false,
    show: { slug: "opera-en-la-selva" },
    destinations: []
  };

  assert.equal(isDirectorySubmissionPacket(packet), true);
  assert.equal(
    isDirectorySubmissionPacket({ ...packet, containsCredentials: true }),
    false
  );
  assert.equal(
    isDirectorySubmissionPacket({ ...packet, version: 2 }),
    false
  );
  assert.equal(
    isDirectorySubmissionPacket({ ...packet, destinations: null }),
    false
  );
});

test("downloads and copies the exact credential-free packet", async () => {
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  );
  const copied = [];
  globalThis.document = testDocument();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async (value) => copied.push(value) } }
  });
  try {
    const packet = validPacket();
    const downloads = [];
    const statuses = [];
    const section = createDirectorySubmissionPacketActions({
      packet,
      text: (key, values = {}) => `${key}:${values.count ?? ""}`,
      downloadJson: (...values) => downloads.push(values),
      setStatus: (_element, value, error = false) => {
        statuses.push({ value, error });
      }
    });
    assert.ok(section);
    const actions = section.children[1];
    await actions.children[0].listeners.click();
    await actions.children[1].listeners.click();

    assert.deepEqual(downloads, [[
      "opera-en-la-selva-directory-submission-packet.json",
      packet
    ]]);
    assert.equal(copied[0], `${JSON.stringify(packet, null, 2)}\n`);
    assert.deepEqual(statuses, [
      { value: "submissionPacketDownloaded:", error: false },
      { value: "submissionPacketCopied:", error: false }
    ]);
  } finally {
    globalThis.document = originalDocument;
    restoreNavigator(originalNavigator);
  }
});

test("keeps the shared feed copy control accessible and selectable", async () => {
  const originalDocument = globalThis.document;
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  );
  globalThis.document = testDocument();
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async () => { throw new Error("no"); } } }
  });
  try {
    const statuses = [];
    const feed = createDistributionFeedActions({
      feedUrl: "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml",
      text: (key) => key,
      setStatus: (_element, value, error = false) => {
        statuses.push({ value, error });
      }
    });
    const input = feed.children[0].children[1];
    await feed.children[1].listeners.click();

    assert.equal(input.value, "https://feeds.dustwave.xyz/opera-en-la-selva/rss.xml");
    assert.equal(input.focused, true);
    assert.equal(input.selected, true);
    assert.deepEqual(statuses, [{ value: "feedCopySelected", error: true }]);
  } finally {
    globalThis.document = originalDocument;
    restoreNavigator(originalNavigator);
  }
});

function validPacket() {
  return {
    schema: "dust-wave-directory-submission-packet",
    version: 1,
    containsCredentials: false,
    show: { slug: "opera-en-la-selva" },
    destinations: [{ enabled: true }]
  };
}

function testDocument() {
  return {
    createElement(tagName) {
      return {
        tagName,
        children: [],
        listeners: {},
        attributes: {},
        append(...children) {
          this.children.push(...children);
        },
        addEventListener(name, listener) {
          this.listeners[name] = listener;
        },
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
        focus() {
          this.focused = true;
        },
        select() {
          this.selected = true;
        }
      };
    }
  };
}

function restoreNavigator(descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, "navigator", descriptor);
  } else {
    delete globalThis.navigator;
  }
}
