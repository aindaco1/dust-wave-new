import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const postsDirectory = path.join(root, "src", "posts");
const localizedProjectsDirectory = path.join(root, "src", "es", "project");
const taxonomy = JSON.parse(await readFile(
  path.join(root, "src", "_data", "projectTaxonomy.json"),
  "utf8"
));

const projectFiles = (await readdir(postsDirectory))
  .filter((file) => file.endsWith(".md"))
  .sort();
const projectSlugs = projectFiles.map((file) => file.replace(/\.md$/, ""));
const configuredSlugs = Object.keys(taxonomy.projects).sort();
const typeSlugs = new Set(taxonomy.types.map(({ slug }) => slug));

function frontmatterTags(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/u)?.[1] || "";
  const block = frontmatter.match(/^tags:\n((?:\s+-\s+[^\n]+\n?)+)/mu)?.[1] || "";
  return Array.from(block.matchAll(/^\s+-\s+(.+)$/gmu), ([, tag]) => tag.trim());
}

test("every project has exactly one valid primary type", () => {
  assert.deepEqual(configuredSlugs, projectSlugs);
  for (const [slug, type] of Object.entries(taxonomy.projects)) {
    assert(typeSlugs.has(type), `${slug} uses unknown project type ${type}`);
  }
});

test("every active type has bilingual labels and at least one project", () => {
  for (const type of taxonomy.types) {
    assert(type.labels.en?.trim(), `${type.slug} needs an English label`);
    assert(type.labels.es?.trim(), `${type.slug} needs a Spanish label`);
    assert(
      Object.values(taxonomy.projects).includes(type.slug),
      `${type.slug} should not appear as an empty archive filter`
    );
  }
});

test("every public secondary tag has bilingual display labels", async () => {
  const hiddenTags = new Set([
    "released",
    "coming-soon",
    "event",
    "exhibition",
    "installation",
    "music-video"
  ]);

  for (const file of projectFiles) {
    const source = await readFile(path.join(postsDirectory, file), "utf8");
    for (const tag of frontmatterTags(source)) {
      if (hiddenTags.has(tag)) continue;
      const labels = taxonomy.tagLabels[tag];
      assert(labels?.en?.trim(), `${file}: ${tag} needs an English label`);
      assert(labels?.es?.trim(), `${file}: ${tag} needs a Spanish label`);
    }
  }
});

test("every configured public tag is used by at least one project", async () => {
  const usedTags = new Set();
  for (const file of projectFiles) {
    const source = await readFile(path.join(postsDirectory, file), "utf8");
    frontmatterTags(source).forEach((tag) => usedTags.add(tag));
  }

  for (const tag of Object.keys(taxonomy.tagLabels)) {
    assert(usedTags.has(tag), `${tag} should not remain as a stale archive facet`);
  }
});

test("animation connects every project whose content explicitly includes animation", async () => {
  const expectedAnimationProjects = [
    "dead-ballerina",
    "high-times-at-the-ranger-bowl-a-rama",
    "horseheads",
    "life-after-dead-air",
    "shellfish-knish"
  ];

  for (const slug of expectedAnimationProjects) {
    const source = await readFile(path.join(postsDirectory, `${slug}.md`), "utf8");
    assert(
      frontmatterTags(source).includes("animation"),
      `${slug} should appear in the Animation archive facet`
    );
  }
});

test("localized project slugs resolve back to the canonical taxonomy", async () => {
  const localizedFiles = (await readdir(localizedProjectsDirectory))
    .filter((file) => file.endsWith(".md"))
    .sort();
  const englishSlugs = taxonomy.localizedSlugs?.en || {};
  const spanishSlugs = taxonomy.localizedSlugs?.es || {};

  for (const file of localizedFiles) {
    const source = await readFile(path.join(localizedProjectsDirectory, file), "utf8");
    const englishRouteSlug = source.match(/^\s*en:\s*\/project\/([^/.]+)\.html$/mu)?.[1];
    const spanishRouteSlug = source.match(/^\s*es:\s*\/es\/project\/([^/.]+)\.html$/mu)?.[1];
    const localizedFileSlug = file.replace(/\.md$/, "");
    const canonicalSlug = Object.entries(spanishSlugs).find(([, localizedSlug]) =>
      localizedSlug === localizedFileSlug
    )?.[0] || localizedFileSlug;

    assert(taxonomy.projects[canonicalSlug], `${file} maps to unknown project ${canonicalSlug}`);
    assert.equal(
      englishSlugs[canonicalSlug] || canonicalSlug,
      englishRouteSlug,
      `${file} needs the canonical English project route`
    );
    assert.equal(
      spanishSlugs[canonicalSlug] || canonicalSlug,
      spanishRouteSlug,
      `${file} needs the canonical Spanish project route`
    );
    assert.equal(
      spanishRouteSlug,
      localizedFileSlug,
      `${file} needs a permalink that matches its localized filename`
    );
  }
});
