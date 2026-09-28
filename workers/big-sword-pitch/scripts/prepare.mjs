import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { patchKeynotePlayer } from './patch-player.mjs';
import { gifPlayOnce } from './gif-play-once.mjs';
import { installMediaPreloader } from './media-preload.mjs';
import { spawnSync } from 'node:child_process';

const worker = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: npm run prepare:assets -- /path/to/Keynote-export');
const original = await readFile(join(source, 'assets/player/main.js'), 'utf8');
let player = patchKeynotePlayer(original);
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
// Slide 25 is the team collage. Keynote already marks it as non-looping, but
// the browser's animated-image element follows the GIF's embedded loop flag.
const teamAssets = join(output, 'assets/BD3FB420-E07D-4D7B-9729-D86BF3CA4834/assets');
const teamFiles = (await readdir(teamAssets)).filter(name => /^dust-wave-pop-ups-5-seconds\.gif-0\.0000-5\.0000(?: \d+)?\.gif$/.test(name));
if (!teamFiles.length) throw new Error('Team collage GIF missing; review this export before publishing.');
for (const name of teamFiles) {
  const path = join(teamAssets, name);
  await writeFile(path, gifPlayOnce(await readFile(path)));
}
const openingIndex = process.argv.indexOf('--opening-video');
if (openingIndex >= 0 && !process.argv[openingIndex + 1]) throw new Error('--opening-video requires a path.');
if (process.argv.includes('--optimize-media') || openingIndex >= 0) {
  const args = [fileURLToPath(new URL('optimize-media.py', import.meta.url)), output];
  if (openingIndex >= 0) args.push(resolve(process.argv[openingIndex + 1]));
  const result = spawnSync('python3', args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Media preparation failed; do not publish this export.');
}
const soundsIndex = process.argv.indexOf('--transition-audio');
if (soundsIndex >= 0) {
  if (!process.argv[soundsIndex + 1]) throw new Error('--transition-audio requires the CC0 source directory.');
  const args = [fileURLToPath(new URL('add-transition-audio.py', import.meta.url)), output,
    resolve(process.argv[soundsIndex + 1])];
  const result = spawnSync('python3', args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Transition audio failed; do not publish this export.');
}
const media = [];
for (const id of header.slideList) {
  const slide = JSON.parse(await readFile(join(output, 'assets', id, id + '.json'), 'utf8'));
  media.push(Object.values(slide.assets).filter(asset => asset.type === 'video')
    .map(asset => `./assets/${id}/${asset.url.native}`));
}
// Replace our previous generated prelude when preparing from an existing export.
player = player.replace(/^\/\* pitch-media-preload:start \*\/[\s\S]*?\/\* pitch-media-preload:end \*\/\n/, '');
player = `/* pitch-media-preload:start */\n(${installMediaPreloader.toString()})(${JSON.stringify(media)});\n/* pitch-media-preload:end */\n${player}`;
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
