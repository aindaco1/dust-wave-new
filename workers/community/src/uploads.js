import { PDFDocument } from 'pdf-lib';
import { randomToken, sha256Hex, sha256BytesHex, timingSafeEqual } from '@dustwave/worker-core/crypto';
import { API, fail, id, plain, pdfFilename } from './domain.js';
import { bodyJson, boundedBytes, challenge, json, requestLimit, verifyOrigin, requireAdmin } from './security.js';
import { getUpload } from './repository.js';
import { retiredMicrocinema } from './retired-microcinema.js';

export const PDF_LIMIT = 10 * 1024 * 1024;
export async function validatePdf(bytes) {
  if (!bytes.length || bytes.length > PDF_LIMIT || new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') fail('invalid_pdf');
  let document;
  try { document = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true }); }
  catch { fail('invalid_pdf'); }
  if (document.isEncrypted) fail('invalid_pdf');
  let pages;
  try { pages = document.getPageCount(); } catch { fail('invalid_pdf'); }
  if (pages < 1 || pages > 35) fail('pdf_page_limit');
  return { pages };
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
    if (data.kind==='image')return retiredMicrocinema();
    if (data.kind!=='pdf')fail('invalid_upload');
    if (route === '/admin/uploads') await requireAdmin(request, env);
    else await challenge(request, env, data.turnstileToken, 'community_submit');
    const uploadId = id(); const token = randomToken();
    const fileName = plain(data.fileName, 255, false);
    await env.COMMUNITY_DB.prepare("INSERT INTO community_uploads(id,token_hash,kind,state,expires_at,data) VALUES (?,?,?,'pending',?,?)")
      .bind(uploadId, await sha256Hex(token), data.kind, Date.now()+3600000, JSON.stringify(fileName ? {fileName:pdfFilename(fileName)} : {})).run();
    return json({ id: uploadId, token, url: `${API}/uploads/${uploadId}`, maxBytes: PDF_LIMIT }, 201);
  }
  const match = route.match(/^\/uploads\/([a-f0-9-]{36})$/u);
  if (match && request.method === 'PUT') {
    verifyOrigin(request, env); await requestLimit(request, env, 'upload-bytes', 24, 3600);
    const upload = await authorizeUpload(env.COMMUNITY_DB, match[1], request.headers.get('x-upload-token'));
    if(upload.kind!=='pdf')return retiredMicrocinema();
    const bytes = await boundedBytes(request, PDF_LIMIT);
    const digest = await sha256BytesHex(bytes);
    if (upload.state !== 'pending') {
      if (upload.digest === digest) return json({ id: upload.id, ready: true, pages: upload.pages });
      fail('upload_already_used', 409);
    }
    const metadata = { digest, fileName: upload.fileName || '', ...await validatePdf(bytes), fileKey: `private/${upload.id}/${digest}.pdf` };
    await env.COMMUNITY_FILES.put(metadata.fileKey, bytes, { httpMetadata: { contentType: 'application/pdf' } });
    const updated = await env.COMMUNITY_DB.prepare("UPDATE community_uploads SET state='ready',data=? WHERE id=? AND state='pending'")
      .bind(JSON.stringify(metadata), upload.id).run();
    if (updated.meta.changes !== 1) {
      const winner=await getUpload(env.COMMUNITY_DB,upload.id);
      if(winner.digest!==digest)await env.COMMUNITY_FILES.delete(metadata.fileKey);
      if(winner.digest===digest)return json({id:upload.id,ready:true,pages:winner.pages});
      fail('upload_already_used',409);
    }
    return json({ id: upload.id, ready: true, pages: metadata.pages });
  }
  return null;
}
