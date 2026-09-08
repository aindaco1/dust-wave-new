import { PDFDocument } from 'pdf-lib';
import { randomToken, sha256Hex, sha256BytesHex, timingSafeEqual } from '@dustwave/worker-core/crypto';
import { API, fail, id } from './domain.js';
import { bodyJson, boundedBytes, challenge, json, requestLimit, verifyOrigin, requireAdmin } from './security.js';
import { getUpload } from './repository.js';

export const IMAGE_LIMIT = 5 * 1024 * 1024;
export const PDF_LIMIT = 10 * 1024 * 1024;
export async function validatePdf(bytes) {
  if (!bytes.length || bytes.length > PDF_LIMIT || new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') fail('invalid_pdf');
  let document;
  try { document = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true }); }
  catch { fail('invalid_pdf'); }
  if (document.isEncrypted) fail('invalid_pdf');
  let pages;
  try { pages = document.getPageCount(); } catch { fail('invalid_pdf'); }
  if (pages < 1 || pages > 20) fail('pdf_page_limit');
  return { pages };
}
export function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'image/png';
  const text = new TextDecoder().decode(bytes.slice(0,12));
  if (text.startsWith('RIFF') && text.endsWith('WEBP')) return 'image/webp';
  fail('invalid_image');
}
function stream(bytes) { return new Blob([bytes]).stream(); }
export async function normalizeImage(bytes, images) {
  imageType(bytes);
  if (!images) fail('images_unavailable', 503);
  const info = await images.info(stream(bytes));
  if (!info.width || !info.height || info.width * info.height > 20000000 || info.width < 100 || info.height < 100) fail('image_dimensions');
  const result = {};
  for (const size of [320,640]) {
    const output = await images.input(stream(bytes)).transform({ width: size, height: size, fit: 'cover' }).output({ format: 'image/webp', quality: 82 });
    result[size] = new Uint8Array(await output.response().arrayBuffer());
  }
  return result;
}
export async function authorizeUpload(db, uploadId, token, { ready = false } = {}) {
  const upload = await getUpload(db, uploadId);
  if (!upload || upload.expires_at < Date.now() || typeof token !== 'string' || token.length > 256 || !timingSafeEqual(upload.token_hash, await sha256Hex(token))) fail('upload_expired', 403);
  if (ready && upload.state !== 'ready') fail('upload_not_ready', 409);
  return upload;
}
export async function uploadRoute(request, env, route) {
  if (['/uploads','/admin/uploads'].includes(route) && request.method === 'POST') {
    verifyOrigin(request, env);
    await requestLimit(request, env, 'uploads', 12, 3600);
    const data = await bodyJson(request);
    if (!['image','pdf'].includes(data.kind)) fail('invalid_upload');
    if (route === '/admin/uploads') await requireAdmin(request, env);
    else await challenge(request, env, data.turnstileToken, 'community_submit');
    const uploadId = id(); const token = randomToken();
    await env.COMMUNITY_DB.prepare("INSERT INTO community_uploads(id,token_hash,kind,state,expires_at) VALUES (?,?,?,'pending',?)")
      .bind(uploadId, await sha256Hex(token), data.kind, Date.now()+3600000).run();
    return json({ id: uploadId, token, url: `${API}/uploads/${uploadId}`, maxBytes: data.kind === 'pdf' ? PDF_LIMIT : IMAGE_LIMIT }, 201);
  }
  const match = route.match(/^\/uploads\/([a-f0-9-]{36})$/u);
  if (match && request.method === 'PUT') {
    verifyOrigin(request, env); await requestLimit(request, env, 'upload-bytes', 24, 3600);
    const upload = await authorizeUpload(env.COMMUNITY_DB, match[1], request.headers.get('x-upload-token'));
    const bytes = await boundedBytes(request, upload.kind === 'pdf' ? PDF_LIMIT : IMAGE_LIMIT);
    const digest = await sha256BytesHex(bytes);
    if (upload.state !== 'pending') {
      if (upload.digest === digest) return json({ id: upload.id, ready: true, pages: upload.pages });
      fail('upload_already_used', 409);
    }
    let metadata = { digest };
    if (upload.kind === 'pdf') {
      metadata = { ...metadata, ...await validatePdf(bytes) };
      metadata.fileKey = `private/${upload.id}/${digest}.pdf`;
      await env.COMMUNITY_FILES.put(metadata.fileKey, bytes, { httpMetadata: { contentType: 'application/pdf' } });
    } else {
      const variants = await normalizeImage(bytes, env.IMAGES);
      metadata.imagePrefix = `images/${upload.id}/${digest}`;
      for (const [size, image] of Object.entries(variants)) await env.COMMUNITY_FILES.put(`${metadata.imagePrefix}/${size}.webp`, image, { httpMetadata: { contentType: 'image/webp' } });
    }
    const updated = await env.COMMUNITY_DB.prepare("UPDATE community_uploads SET state='ready',data=? WHERE id=? AND state='pending'")
      .bind(JSON.stringify(metadata), upload.id).run();
    if (updated.meta.changes !== 1) {
      const winner=await getUpload(env.COMMUNITY_DB,upload.id);
      if(winner.digest!==digest)await env.COMMUNITY_FILES.delete(metadata.fileKey?[metadata.fileKey]:[`${metadata.imagePrefix}/320.webp`,`${metadata.imagePrefix}/640.webp`]);
      if(winner.digest===digest)return json({id:upload.id,ready:true,pages:winner.pages});
      fail('upload_already_used',409);
    }
    return json({ id: upload.id, ready: true, pages: metadata.pages });
  }
  return null;
}
