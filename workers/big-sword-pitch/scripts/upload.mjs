import { readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../../.artifacts/big-sword-pitch/', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json')));
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (R2 write).');
const bucket = 'dustwave-big-sword-pitch-private';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsonp': 'text/javascript; charset=utf-8', '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const checkpointPath = resolve(root, `uploaded-${manifest.prefix.split('/')[1]}.json`);
const uploaded = new Set(JSON.parse(await readFile(checkpointPath, 'utf8').catch(() => '[]')));
for (const [index, file] of manifest.files.entries()) {
  if (uploaded.has(file.path)) continue;
  const path = resolve(root, 'presentation', file.path);
  if (createHash('sha256').update(await readFile(path)).digest('hex') !== file.sha256) throw new Error(`File changed after prepare: ${file.path}`);
  const key = `${manifest.prefix}/${file.path}`;
  const result = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': types[extname(file.path)] || 'application/octet-stream', 'Content-Length': String(file.size) },
    body: createReadStream(path), duplex: 'half',
  });
  if (!result.ok) throw new Error(`Upload failed (${result.status}): ${file.path}`);
  const body = await result.json();
  if (!body.success) throw new Error(`Upload rejected: ${file.path}`);
  uploaded.add(file.path);
  await writeFile(checkpointPath, JSON.stringify([...uploaded]));
  if (index % 25 === 0 || file.size > 25_000_000 || index === manifest.files.length - 1) console.log(`Uploaded ${index + 1}/${manifest.files.length}`);
}
console.log(`Complete. Set ASSET_PREFIX to ${manifest.prefix} before deployment.`);
