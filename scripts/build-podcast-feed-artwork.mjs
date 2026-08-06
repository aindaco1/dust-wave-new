import path from "node:path";

import sharp from "sharp";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(
  repositoryRoot,
  "src/img/podcasts/opera-en-la-selva/artwork.png"
);
const outputPath = path.join(
  repositoryRoot,
  "src/img/podcasts/opera-en-la-selva/artwork-feed.jpg"
);

await sharp(sourcePath)
  .resize(1400, 1400, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3
  })
  .flatten({ background: "#ffffff" })
  .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
  .toFile(outputPath);

console.log(`Generated ${path.relative(repositoryRoot, outputPath)}.`);
