import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { validatePdf } from '../src/uploads.js';
import { emptyState, allocate, upcoming, pdfFilename } from '../src/domain.js';
import { safeDownloadFilename } from '../../../shared/dust-wave-platform/packages/admin-shell/src/credentialed-download.js';
import { renderMeetings } from '../src/render.js';

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
});
test('reading agendas escape submitted titles and authors',()=>{
  const now=new Date('2026-09-08T12:00Z');const state=allocate(emptyState(),now);
  state.events[0].agenda=[{title:'<img src=x onerror=alert(1)>',author:'<script>private</script>'}];
  const html=renderMeetings(upcoming(state,'en',now),'en');
  assert.doesNotMatch(html,/<img src=x|<script>/);assert.match(html,/&lt;img/);
  assert.match(html,/Open reading slot/);
});
