import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";

const root = path.resolve(import.meta.dirname, "..");
const configPath = path.join(root, ".pages.yml");
const configSource = await readFile(configPath, "utf8");
const config = matter.engines.yaml.parse(configSource);

const collections = new Map(
  config.content.map((collection) => [collection.name, collection])
);
const mediaLibraries = new Map(
  config.media.map((library) => [library.name, library])
);

function fieldByName(collectionName, fieldName) {
  const collection = collections.get(collectionName);
  assert(collection, `Pages CMS needs the ${collectionName} collection`);
  const field = collection.fields.find((candidate) => candidate.name === fieldName);
  assert(field, `${collectionName} needs a ${fieldName} field`);
  return field;
}

function visitFields(fields, visit, trail = []) {
  for (const field of fields || []) {
    const nextTrail = [...trail, field.name];
    visit(field, nextTrail);
    visitFields(field.fields, visit, nextTrail);
  }
}

async function loadFrontmatter(directory) {
  const absoluteDirectory = path.join(root, directory);
  const files = (await readdir(absoluteDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(files.map(async (file) => ({
    data: matter(await readFile(path.join(absoluteDirectory, file), "utf8")).data,
    file: path.posix.join(directory, file)
  })));
}

function validateFieldValue(value, field, label) {
  if (value === undefined || value === null) return;

  if (field.type === "object") {
    const objects = field.list ? value : [value];
    assert(Array.isArray(objects), `${label} must be an object list`);
    for (const object of objects) {
      assert(object && typeof object === "object" && !Array.isArray(object), `${label} entries must be objects`);
      for (const [key, nestedValue] of Object.entries(object)) {
        const nestedField = field.fields.find((candidate) => candidate.name === key);
        assert(nestedField, `${label}.${key} is not represented in Pages CMS`);
        validateFieldValue(nestedValue, nestedField, `${label}.${key}`);
      }
    }
    return;
  }

  if (field.list || field.options?.multiple) {
    assert(Array.isArray(value), `${label} must remain a list`);
  }

  if (field.type === "select") {
    const allowed = new Set(field.options.values.map((option) => (
      typeof option === "object" ? option.value : option
    )));
    const values = field.options.multiple ? value : [value];
    for (const selected of values) {
      assert(allowed.has(selected), `${label} contains unsupported option ${selected}`);
    }
  }
}

test("Pages CMS uses current safe media and merge settings", () => {
  assert.equal(config.settings?.content?.merge, true);
  assert.deepEqual([...mediaLibraries.keys()], ["images", "videos"]);

  for (const collection of collections.values()) {
    visitFields(collection.fields, (field, trail) => {
      assert.equal(
        Object.hasOwn(field, "media"),
        false,
        `${collection.name}.${trail.join(".")} uses obsolete field-level media syntax`
      );

      const mediaName = field.options?.media;
      if (!mediaName || mediaName === false) return;
      const library = mediaLibraries.get(mediaName);
      assert(library, `${collection.name}.${trail.join(".")} references unknown media ${mediaName}`);

      if (field.options.path) {
        assert(
          field.options.path === library.input || field.options.path.startsWith(`${library.input}/`),
          `${collection.name}.${trail.join(".")} media path must stay within ${library.input}`
        );
      }
    });
  }
});

test("Pages CMS protects collections with external file contracts", () => {
  const projects = collections.get("posts");
  const digests = collections.get("digests");

  assert.deepEqual(projects.operations, {
    create: false,
    rename: false,
    delete: false
  });
  assert.deepEqual(digests.operations, {
    create: false,
    rename: false,
    delete: false
  });

  assert.equal(collections.get("members").filename, "{fields.slug}.md");
  assert.deepEqual(collections.get("news-regular").filename, {
    template: "{primary}.md",
    field: "create"
  });
});

test("film fields match the current project frontmatter model", () => {
  const projects = collections.get("posts");
  assert.equal(projects.fields.some((field) => field.name === "gif"), false);

  const tags = fieldByName("posts", "tags");
  assert.equal(tags.type, "string");
  assert.equal(tags.list, true);

  const gallery = fieldByName("posts", "galleryImages");
  assert.equal(gallery.type, "object");
  assert(gallery.list);
  assert.deepEqual(gallery.fields.map((field) => field.name), ["src", "alt", "caption"]);

  const videos = fieldByName("posts", "projectVideos");
  assert.equal(videos.type, "object");
  assert(videos.list);
  assert.deepEqual(videos.fields.map((field) => field.name), ["heading", "id", "type"]);

  const newsGallery = fieldByName("news-regular", "galleryImages");
  assert.equal(newsGallery.type, "image");
  assert.equal(newsGallery.options.multiple, true);
});

test("all current frontmatter keys and structured values are editable", async () => {
  const sources = [
    ["members", "src/members"],
    ["posts", "src/posts"],
    ["news-regular", "src/news"],
    ["digests", "src/news/digests"]
  ];

  for (const [collectionName, directory] of sources) {
    const collection = collections.get(collectionName);
    const fields = new Map(collection.fields.map((field) => [field.name, field]));
    const entries = await loadFrontmatter(directory);

    for (const entry of entries) {
      for (const [key, value] of Object.entries(entry.data)) {
        const field = fields.get(key);
        assert(field, `${entry.file}: ${key} is not represented in Pages CMS`);
        validateFieldValue(value, field, `${entry.file}:${key}`);
      }
    }
  }
});
