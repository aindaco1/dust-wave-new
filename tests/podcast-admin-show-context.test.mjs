import assert from "node:assert/strict";
import test from "node:test";
import { mountPodcastShowContext } from "../src/js/podcast-admin-show-context.js";

function fixture() {
  const ownerDocument = {
    createElement() {
      return { selected: false, textContent: "", value: "" };
    }
  };
  const name = { hidden: true, textContent: "" };
  const scopedName = { textContent: "" };
  const switcher = { hidden: false };
  const select = {
    hidden: false,
    options: [],
    ownerDocument,
    value: "",
    replaceChildren(...options) {
      this.options = options;
      this.value = options.find(({ selected }) => selected)?.value
        || options[0]?.value
        || "";
    }
  };
  const container = {
    hidden: false,
    querySelector(selector) {
      return {
        "[data-podcast-show-name]": name,
        "[data-podcast-show-select]": select,
        "[data-podcast-show-switcher]": switcher
      }[selector] || null;
    }
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-podcast-show-context]"
        ? [container]
        : [scopedName];
    }
  };
  return { container, name, root, scopedName, select, switcher };
}

test("single-show launch replaces selector chrome with the show name", () => {
  const { container, name, root, scopedName, select, switcher } = fixture();
  const context = mountPodcastShowContext(root);
  context.setShows([{ id: "show-one", title: "Show one" }], "show-one");

  assert.equal(container.hidden, false);
  assert.equal(name.hidden, false);
  assert.equal(name.textContent, "Show one");
  assert.equal(scopedName.textContent, "Show one");
  assert.equal(switcher.hidden, true);
  assert.equal(select.hidden, true);
  assert.equal(select.value, "show-one");
  assert.deepEqual(context.selects, [select]);
});

test("multi-show mode keeps the selected show prominent and adds a switcher", () => {
  const { name, root, scopedName, select, switcher } = fixture();
  const context = mountPodcastShowContext(root);
  context.setShows([
    { id: "show-one", title: "Show one" },
    { id: "show-two", title: "Show two" }
  ], "show-two");

  assert.equal(name.hidden, false);
  assert.equal(name.textContent, "Show two");
  assert.equal(scopedName.textContent, "Show two");
  assert.equal(switcher.hidden, false);
  assert.equal(select.hidden, false);
  assert.equal(select.value, "show-two");
  assert.deepEqual(
    select.options.map(({ textContent }) => textContent),
    ["Show one", "Show two"]
  );
});

test("empty show state conceals the workspace", () => {
  const { container, name, root, scopedName, select } = fixture();
  mountPodcastShowContext(root).setShows([], "");

  assert.equal(container.hidden, true);
  assert.equal(name.hidden, true);
  assert.equal(scopedName.textContent, "");
  assert.equal(select.hidden, false);
  assert.equal(select.value, "");
});
