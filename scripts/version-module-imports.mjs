import {
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VERSION_PATTERN = /^[A-Za-z0-9._-]{1,64}$/u;
const VERSIONED_IMPORT_PATTERN =
  /(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.\.?\/[^"'?\r\n]+\.js)\2/gu;
const VERSIONED_SIDE_EFFECT_IMPORT_PATTERN =
  /(\bimport\s+)(["'])(\.\.?\/[^"'?\r\n]+\.js)\2/gu;

export function versionModuleImports(source, version) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error("The module asset version is invalid.");
  }
  const query = `?v=${encodeURIComponent(version)}`;
  return source
    .replace(
      VERSIONED_IMPORT_PATTERN,
      (_, prefix, quote, specifier) =>
        `${prefix}${quote}${specifier}${query}${quote}`
    )
    .replace(
      VERSIONED_SIDE_EFFECT_IMPORT_PATTERN,
      (_, prefix, quote, specifier) =>
        `${prefix}${quote}${specifier}${query}${quote}`
    );
}

async function versionDirectory(directory, version) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await versionDirectory(target, version);
      return;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) return;
    const source = await readFile(target, "utf8");
    const versioned = versionModuleImports(source, version);
    if (versioned !== source) {
      await writeFile(target, versioned, "utf8");
    }
  }));
}

async function main() {
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
  );
  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8")
  );
  const version = String(
    process.env.DUST_WAVE_ASSET_VERSION
    || process.env.GITHUB_SHA
    || packageJson.version
    || ""
  ).trim();
  const directory = path.resolve(
    repositoryRoot,
    process.argv[2] || "docs/js"
  );
  await versionDirectory(directory, version);
  process.stdout.write(
    `Versioned local JavaScript module imports with ${version}.\n`
  );
}

if (
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
