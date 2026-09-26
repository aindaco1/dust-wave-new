import { readFile, writeFile } from 'node:fs/promises';
import { fetch } from 'undici';
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
async function uploadFile(file) {
  const path = resolve(root, 'presentation', file.path);
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`File changed after prepare: ${file.path}`);
  const key = `${manifest.prefix}/${file.path}`;
  const result = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'wrangler/4.141.0', 'cf-r2-data-catalog-check': 'true', 'Content-Type': types[extname(file.path)] || 'application/octet-stream', 'Content-Length': String(file.size) },
    body: bytes, signal: AbortSignal.timeout(600000),
  });
  if (!result.ok) throw new Error(`Upload failed (${result.status}): ${file.path}`);
  const body = await result.json();
  if (!body.success) throw new Error(`Upload rejected: ${file.path}`);
  return file.path;
}
async function uploadWithRetry(file) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { return await uploadFile(file); }
    catch (error) {
      if (attempt === 3) throw error;
      console.log(`Retrying ${file.path}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}
const pending = manifest.files.filter(file => !uploaded.has(file.path));
// Buffer a bounded batch: the streaming Node fetch transport can drop large
// R2 PUT bodies. Save every success even when another upload in the batch fails.
for (let offset = 0; offset < pending.length; offset += 4) {
  const results = await Promise.allSettled(pending.slice(offset, offset + 4).map(uploadWithRetry));
  for (const result of results) if (result.status === 'fulfilled') uploaded.add(result.value);
  await writeFile(checkpointPath, JSON.stringify([...uploaded]));
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  console.log(`Uploaded ${uploaded.size}/${manifest.files.length}`);
}
console.log(`Complete. Set ASSET_PREFIX to ${manifest.prefix} before deployment.`);
