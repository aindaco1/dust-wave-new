import { readFile } from "node:fs/promises";

const INCLUDE_PATTERN = /\{%\s*include\s+["']([^"']+)["']\s*%\}/g;

export async function readNunjucksSource(
  entry,
  includesRoot = new URL("../../src/_includes/", import.meta.url)
) {
  return inlineNunjucksIncludes(
    await readFile(entry, "utf8"),
    includesRoot,
    []
  );
}

async function inlineNunjucksIncludes(source, includesRoot, stack) {
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(INCLUDE_PATTERN)) {
    result += source.slice(cursor, match.index);
    const includeUrl = new URL(match[1], includesRoot);
    const includeIdentity = includeUrl.href;
    if (stack.includes(includeIdentity)) {
      throw new Error(
        `Circular Nunjucks include: ${[...stack, includeIdentity].join(" -> ")}`
      );
    }
    const includeSource = await readFile(includeUrl, "utf8");
    result += await inlineNunjucksIncludes(
      includeSource,
      includesRoot,
      [...stack, includeIdentity]
    );
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}
