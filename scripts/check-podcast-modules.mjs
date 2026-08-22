import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const repositoryRoot = new URL("../", import.meta.url);

const manifests = [
  {
    directory: "src/js",
    recursive: false,
    include: (name) =>
      (name.startsWith("podcast") || name === "datatype-chart.js" || name === "site-i18n.js")
      && name.endsWith(".js")
  },
  {
    directory: "shared/dust-wave-platform/packages/admin-shell/src",
    recursive: false,
    include: (name) => name.endsWith(".js")
  },
  {
    directory: "scripts",
    recursive: true,
    include: (name) => name.endsWith(".mjs")
  }
];

const files = new Set(["tests/fixtures/podcast-admin-mock-api.mjs"]);
for (const manifest of manifests) {
  const directory = new URL(`${manifest.directory}/`, repositoryRoot);
  for (const relativeName of await readdir(directory, {
    recursive: manifest.recursive
  })) {
    const name = relativeName.split("/").at(-1);
    if (!manifest.include(name)) continue;
    files.add(`${manifest.directory}/${relativeName}`);
  }
}

const sortedFiles = [...files].sort();
assert(sortedFiles.length >= 100, "Podcast syntax manifest is unexpectedly small");

for (const file of sortedFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: new URL(repositoryRoot),
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`Syntax validation failed for ${file}`);
  }
}

console.log(`Syntax-checked ${sortedFiles.length} Podcast modules.`);
