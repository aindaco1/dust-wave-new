import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { patchKeynotePlayer } from './patch-player.mjs';

const worker = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: npm run prepare:assets -- /path/to/Keynote-export');
const original = await readFile(join(source, 'assets/player/main.js'), 'utf8');
const player = patchKeynotePlayer(original);
const header = JSON.parse(await readFile(join(source, 'assets/header.json'), 'utf8'));
const output = resolve(worker, '../../.artifacts/big-sword-pitch/presentation');
if (source === output || source.startsWith(output + '/')) throw new Error('Source must be outside the generated presentation directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Copy only export files, never the source deck, notes, or operating-system metadata.
await cp(join(source, 'assets'), join(output, 'assets'), { recursive: true, filter: path => !path.endsWith('.DS_Store') });
let html = await readFile(join(source, 'index.html'), 'utf8');
html = html.replace('<title>Keynote</title>', '<title>Big Sword — Pitch</title><meta name="robots" content="noindex,nofollow"/><link rel="icon" href="data:,"/>');
await writeFile(join(output, 'index.html'), html);
await writeFile(join(output, 'assets/player/main.js'), player);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      const bytes = await readFile(path);
      files.push({ path: relative(output, path), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await walk(output);
files.sort((a, b) => a.path.localeCompare(b.path));
const digest = createHash('sha256').update(JSON.stringify(files)).digest('hex');
const manifest = { prefix: `exports/${digest.slice(0,20)}`, slideCount: header.slideCount, files };
await writeFile(resolve(output, '../manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output, prefix: manifest.prefix, slides: header.slideCount, files: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0) }));
