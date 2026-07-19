import { access, readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';

if (process.env.GITHUB_ACTIONS !== 'true') {
  console.error('WebP generation is restricted to GitHub Actions.');
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const sourceDirectory = path.join(projectRoot, 'src/img');
const buildDirectory = path.join(projectRoot, 'docs');
const outputDirectory = path.join(projectRoot, 'docs/img/webp');
const sourceExtensions = ['.jpg', '.jpeg', '.png'];
const textBuildFile = /\.(html|xml|json|css)$/i;
const webpReference = /\/img\/webp\/([^"'()<>\s?&#]+\.webp)/g;

async function findFiles(directory, matchesFile) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findFiles(entryPath, matchesFile));
    } else if (entry.isFile() && matchesFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function findReferencedWebps() {
  const buildFiles = await findFiles(buildDirectory, (fileName) => textBuildFile.test(fileName));
  const references = new Set();

  for (const buildFile of buildFiles) {
    const contents = await readFile(buildFile, 'utf8');

    for (const match of contents.matchAll(webpReference)) {
      references.add(decodeURIComponent(match[1]));
    }
  }

  return [...references].sort();
}

async function findSourceImage(webpPath) {
  const sourceStem = path.join(sourceDirectory, webpPath.replace(/\.webp$/i, ''));

  for (const extension of sourceExtensions) {
    const sourcePath = `${sourceStem}${extension}`;

    try {
      await access(sourcePath);
      return sourcePath;
    } catch {
      // Try the next supported source extension.
    }
  }

  throw new Error(`No JPG or PNG source found for /img/webp/${webpPath}`);
}

async function convertImage({ sourcePath, webpPath }) {
  const outputPath = path.join(outputDirectory, webpPath);
  const sourceBuffer = await readFile(sourcePath);
  const webpBuffer = await imagemin.buffer(sourceBuffer, {
    plugins: [imageminWebp({ quality: 70 })]
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, webpBuffer);
}

async function main() {
  const webpPaths = await findReferencedWebps();
  const conversions = await Promise.all(webpPaths.map(async (webpPath) => ({
    webpPath,
    sourcePath: await findSourceImage(webpPath)
  })));
  let nextImageIndex = 0;
  const workerCount = Math.min(4, conversions.length);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextImageIndex < conversions.length) {
      const conversion = conversions[nextImageIndex];
      nextImageIndex += 1;
      await convertImage(conversion);
    }
  });

  await Promise.all(workers);
  console.log(`Generated ${conversions.length} referenced WebP images in docs/img/webp/`);
}

await main();
