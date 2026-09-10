import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { validatePdf, imageType } from '../src/uploads.js';
import { initCardRenderer, renderCard, cardSvg } from '../src/cards.js';
import { emptyState, allocate, monthView, pdfFilename } from '../src/domain.js';
import { safeDownloadFilename } from '../../../shared/dust-wave-platform/packages/admin-shell/src/credentialed-download.js';
import { renderCalendar, renderMeetings } from '../src/render.js';

test('PDF filenames preserve draft markers and work with the shared download policy',()=>{
  for(const [input,expected] of [
    ['Guion de María - v2.1.pdf','Guion de María - v2.1.pdf'],
    ['../../private/Revision 2.pdf','Revision 2.pdf'],
    ['C:\\private\\Revision 2.PDF','Revision 2.pdf'],
    ['.hidden..draft\r\n<script>.pdf','hidden.draft script.pdf'],
    ['../','writers-group-script.pdf'],
  ])assert.equal(pdfFilename(input),expected);
  for(const input of ['Guion de María - v2.1.pdf','.hidden..draft.pdf','a'.repeat(119)+'𐐀.pdf','draft'.repeat(100)+'.pdf','../']){
    const filename=pdfFilename(input);
    assert.equal(safeDownloadFilename(filename),filename);
    assert.doesNotThrow(()=>encodeURIComponent(filename));
    assert(filename.length<=128);
  }
});
test('PDF validation uses actual pages, rejecting invalid or overlength files',async()=>{
  const pdf=await PDFDocument.create();pdf.addPage();
  assert.equal((await validatePdf(await pdf.save())).pages,1);
  for(let i=1;i<35;i++)pdf.addPage();
  assert.equal((await validatePdf(await pdf.save())).pages,35);
  pdf.addPage();
  await assert.rejects(()=>validatePdf(pdf.save()),/invalid_pdf/);
  await assert.rejects(()=>pdf.save().then(validatePdf),/pdf_page_limit/);
  await assert.rejects(()=>validatePdf(new TextEncoder().encode('%PDF-fake')),/invalid_pdf/);
  assert.throws(()=>imageType(new TextEncoder().encode('<svg></svg>')),/invalid_image/);
});
test('calendar safely escapes submitted titles, supports weekends and navigation',()=>{
  const now=new Date('2026-09-08T12:00Z');const state=allocate(emptyState(),now);
  const view=monthView(state,'2026-09','en',now);
  view.events[0].title='<img src=x onerror=alert(1)>';
  const html=renderCalendar(view,'https://dustwave.xyz');
  assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
  assert.match(html,/Sun/);assert.match(html,/month=2026-09/);
  assert.match(renderMeetings(view.events,'en'),/Open reading slot/);
});
test('portable month card renders a real 1200 by 630 PNG with escaped data',async()=>{
  await initCardRenderer(await readFile(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm',import.meta.url)));
  const now=new Date('2026-09-08T12:00Z');const view=monthView(allocate(emptyState(),now),'2026-09','en',now);
  view.events[0].title='<script>example</script>';
  assert.doesNotMatch(cardSvg(view),/<script>/);
  const png=await renderCard(view,await readFile(new URL('../assets/Inter-Bold.ttf',import.meta.url)));
  const data=new DataView(png.buffer,png.byteOffset,png.byteLength);
  assert.equal(data.getUint32(16),1200);assert.equal(data.getUint32(20),630);assert(png.length>10000);
});
