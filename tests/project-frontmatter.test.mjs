import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import matter from "gray-matter";
import socialPreviewImageModule from "../lib/social-preview-image.cjs";

const { socialPreviewImage } = socialPreviewImageModule;

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "src");
const projectDirectories = [
  path.join(sourceRoot, "posts"),
  path.join(sourceRoot, "es", "project")
];
const taxonomy = JSON.parse(await readFile(
  path.join(sourceRoot, "_data", "projectTaxonomy.json"),
  "utf8"
));

async function loadProjects(directory) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".md"))
    .sort();

  return Promise.all(files.map(async (file) => {
    const absolutePath = path.join(directory, file);
    const source = await readFile(absolutePath, "utf8");
    const parsed = matter(source);
    return {
      absolutePath,
      data: parsed.data,
      body: parsed.content,
      file,
      source
    };
  }));
}

const englishProjects = await loadProjects(projectDirectories[0]);
const spanishProjects = await loadProjects(projectDirectories[1]);
const allProjects = [...englishProjects, ...spanishProjects];

function label(project) {
  return path.relative(root, project.absolutePath);
}

async function assertLocalAsset(project, value, field) {
  assert.equal(typeof value, "string", `${label(project)}: ${field} must be a string`);
  assert(value.startsWith("/"), `${label(project)}: ${field} must use a root-relative URL`);
  assert(!value.startsWith("//"), `${label(project)}: ${field} must not use a protocol-relative URL`);

  const assetPath = path.join(sourceRoot, value.replace(/^\/+/, ""));
  await access(assetPath).catch(() => {
    assert.fail(`${label(project)}: ${field} points to missing asset ${value}`);
  });
  const asset = await stat(assetPath);
  assert(asset.size > 0, `${label(project)}: ${field} points to an empty asset ${value}`);
}

test("all project files use parseable YAML frontmatter", () => {
  assert.equal(englishProjects.length, Object.keys(taxonomy.projects).length);
  assert.equal(spanishProjects.length, englishProjects.length);

  for (const project of allProjects) {
    assert(project.source.startsWith("---\n"), `${label(project)} needs YAML frontmatter`);
    assert(project.data.title, `${label(project)} needs a title`);
  }
});

test("legacy GIF hover fields do not return", () => {
  for (const project of allProjects) {
    assert.equal(project.data.gif, undefined, `${label(project)} still uses the legacy gif field`);
  }
});

test("project hero GIFs are the canonical social and structured-data preview", async () => {
  const gifProjects = allProjects.filter((project) => /\.gif$/iu.test(project.data.img || ""));
  assert(gifProjects.length > 0, "expected at least one project with a GIF hero");

  for (const project of gifProjects) {
    assert.equal(
      socialPreviewImage(project.data.og_image, project.data.img, true),
      project.data.img,
      `${label(project)}: its GIF hero must take precedence over og_image`
    );
    await assertLocalAsset(project, project.data.img, "img");
  }
});

test("explicit preview overrides remain authoritative without a project GIF hero", () => {
  assert.equal(
    socialPreviewImage("/img/og/custom.jpg", "/img/stills/project.jpg", true),
    "/img/og/custom.jpg"
  );
  assert.equal(
    socialPreviewImage("/img/og/custom.jpg", "/img/news/animated.gif", false),
    "/img/og/custom.jpg"
  );
});

test("hover video definitions are complete and point to real assets", async () => {
  const fields = ["hoverVideoWebm", "hoverVideoMp4", "hoverVideoPoster"];

  for (const project of allProjects) {
    const configured = fields.filter((field) => project.data[field]);
    assert(
      configured.length === 0 || configured.length === fields.length,
      `${label(project)} must define all three hover video fields or none of them`
    );
    for (const field of configured) {
      await assertLocalAsset(project, project.data[field], field);
    }
  }
});

test("gallery and poster frontmatter is complete and points to real assets", async () => {
  for (const project of allProjects) {
    if (project.data.galleryHeading || project.data.galleryImages) {
      assert.equal(
        typeof project.data.galleryHeading,
        "string",
        `${label(project)}: galleryHeading is required when galleryImages is present`
      );
      assert(
        Array.isArray(project.data.galleryImages) && project.data.galleryImages.length > 0,
        `${label(project)}: galleryImages must be a non-empty array`
      );
      for (const [index, image] of project.data.galleryImages.entries()) {
        assert.equal(typeof image?.src, "string", `${label(project)}: galleryImages[${index}].src is required`);
        assert.equal(typeof image?.alt, "string", `${label(project)}: galleryImages[${index}].alt is required`);
        assert(image.alt.trim(), `${label(project)}: galleryImages[${index}].alt must not be empty`);
        await assertLocalAsset(project, image.src, `galleryImages[${index}].src`);
      }
    }

    if (project.data.additionalGalleries) {
      assert(
        Array.isArray(project.data.additionalGalleries) && project.data.additionalGalleries.length > 0,
        `${label(project)}: additionalGalleries must be a non-empty array`
      );
      for (const [galleryIndex, gallery] of project.data.additionalGalleries.entries()) {
        assert(gallery.heading?.trim(), `${label(project)}: additionalGalleries[${galleryIndex}].heading is required`);
        assert(
          Array.isArray(gallery.images) && gallery.images.length > 0,
          `${label(project)}: additionalGalleries[${galleryIndex}].images must be a non-empty array`
        );
        for (const [imageIndex, image] of gallery.images.entries()) {
          assert.equal(
            typeof image?.src,
            "string",
            `${label(project)}: additionalGalleries[${galleryIndex}].images[${imageIndex}].src is required`
          );
          assert(
            image.alt?.trim(),
            `${label(project)}: additionalGalleries[${galleryIndex}].images[${imageIndex}].alt is required`
          );
          await assertLocalAsset(
            project,
            image.src,
            `additionalGalleries[${galleryIndex}].images[${imageIndex}].src`
          );
        }
      }
    }

    if (project.data.poster) {
      assert(project.data.posterHeading?.trim(), `${label(project)}: posterHeading is required with poster`);
      assert(project.data.posterAlt?.trim(), `${label(project)}: posterAlt is required with poster`);
      await assertLocalAsset(project, project.data.poster, "poster");
    }
  }
});

test("project video and coming-soon frontmatter is complete", () => {
  for (const project of allProjects) {
    if (project.data.projectVideos) {
      assert(
        Array.isArray(project.data.projectVideos) && project.data.projectVideos.length > 0,
        `${label(project)}: projectVideos must be a non-empty array`
      );
      for (const [index, video] of project.data.projectVideos.entries()) {
        assert(video.heading?.trim(), `${label(project)}: projectVideos[${index}].heading is required`);
        assert(video.id?.toString().trim(), `${label(project)}: projectVideos[${index}].id is required`);
        assert(
          ["youtube", "vimeo"].includes(video.type),
          `${label(project)}: projectVideos[${index}].type must be youtube or vimeo`
        );
      }
    }

    if (project.data.movieComingSoon) {
      assert(project.data.movieHeading?.trim(), `${label(project)}: movieHeading is required for coming-soon projects`);
      assert(
        project.data.movieComingSoonText?.trim(),
        `${label(project)}: movieComingSoonText is required for coming-soon projects`
      );
    }
  }
});

test("standard project media is not hand-coded in Markdown bodies", () => {
  const legacyPatterns = [
    { name: "legacy YouTube or Vimeo iframe", pattern: /<iframe[^>]+(?:youtube(?:-nocookie)?\.com|youtu\.be|player\.vimeo\.com)/iu },
    { name: "inline responsive embed styles", pattern: /<style>[\s\S]*?\.embed-container/iu },
    { name: "legacy coming-soon block", pattern: /<h2>\s*(?:Movie|Película)\s*<\/h2>\s*<p><strong>\s*(?:Coming soon|Muy pronto)/iu },
    { name: "legacy poster block", pattern: /<h3>\s*(?:Poster|Cartel)\s*<\/h3>\s*<img/iu }
  ];

  for (const project of allProjects) {
    for (const { name, pattern } of legacyPatterns) {
      assert(!pattern.test(project.body), `${label(project)} still contains a ${name}`);
    }
  }
});

test("localized projects share the same hover media contract", () => {
  const spanishBySlug = new Map(spanishProjects.map((project) => [project.file.replace(/\.md$/u, ""), project]));
  const localizedSlugs = taxonomy.localizedSlugs?.es || {};
  const fields = ["hoverVideoWebm", "hoverVideoMp4", "hoverVideoPoster"];

  for (const english of englishProjects) {
    const canonicalSlug = english.file.replace(/\.md$/u, "");
    const localizedSlug = localizedSlugs[canonicalSlug] || canonicalSlug;
    const spanish = spanishBySlug.get(localizedSlug);
    assert(spanish, `${label(english)} needs a Spanish project counterpart`);

    for (const field of fields) {
      assert.equal(
        spanish.data[field],
        english.data[field],
        `${label(spanish)}: ${field} must match the English project`
      );
    }
  }
});
