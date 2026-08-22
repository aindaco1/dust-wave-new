import { readFile } from "node:fs/promises";

const IMPORT_PATTERN = /^\s*@import\s+["']([^"']+)["'];\s*$/gm;

export async function readSassSource(entry) {
  return inlineSassImports(new URL(entry), []);
}

async function inlineSassImports(entryUrl, stack) {
  const identity = entryUrl.href;
  if (stack.includes(identity)) {
    throw new Error(`Circular Sass import: ${[...stack, identity].join(" -> ")}`);
  }
  const source = await readFile(entryUrl, "utf8");
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    result += source.slice(cursor, match.index);
    const segments = match[1].split("/");
    const basename = segments.pop();
    const partialPath = [...segments, `_${basename}.scss`].join("/");
    const partialUrl = new URL(partialPath, entryUrl);
    result += await inlineSassImports(partialUrl, [...stack, identity]);
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}
