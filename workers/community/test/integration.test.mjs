import {migrateFixture} from './fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { PDFDocument } from 'pdf-lib';
import { loadState, commitState } from '../src/repository.js';

const origin='http://localhost:8787';
test('real Worker + D1 + R2: moderation, private files, sessions, atomic scheduling and retries',async t=>{
  const bundle=await build({stdin:{contents:"const RealDate=Date; globalThis.Date=class extends RealDate { constructor(...args){super(...(args.length?args:['2026-09-08T12:00:00Z']));} static now(){return +new RealDate('2026-09-08T12:00:00Z');} }; import {createApp} from './src/app.js'; export default createApp({card:async()=>'/api/community/v1/cards/en/2026-09/test.png'});",resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
  const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:"community-test",modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-09-07',
    d1Databases:['COMMUNITY_DB'],r2Buckets:['COMMUNITY_FILES'],bindings:{SITE_BASE:origin,APP_MODE:'local',LOCAL_CHALLENGE_BYPASS:'true'},
    serviceBindings:{SITE_ASSETS:()=>new Response('<html><head><title>Calendar</title><meta property="og:image" content="default"><link rel="canonical" href="default"></head><body><section data-community-slot="1">Unavailable</section></body></html>',{headers:{'Content-Type':'text/html'}})}}]}));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('COMMUNITY_DB');
  await migrateFixture(db);
  let cookie='',csrf='';
  async function request(path,{body,method=body?'POST':'GET',auth=false,headers={}}={}){
    return mf.dispatchFetch(origin+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie,'x-dustwave-csrf':csrf}:{}),...headers},body:body?JSON.stringify(body):undefined});
  }
  const api=(path,options)=>request('/api/community/v1'+path,options);
  async function ok(path,options){const response=await api(path,options);const data=await response.json();assert(response.ok,JSON.stringify(data));return data;}
  const initial=await ok('/calendar');assert.equal(initial.events[0].id,'writers-2026-09-21');
  assert.equal((await api('/admin/state')).status,401);
  assert.equal((await api('/uploads',{body:{kind:'pdf'},headers:{Origin:'https://elsewhere.test'}})).status,403);
  const start=await ok('/admin/auth/start',{body:{email:'admin@example.test'}});
  const token=new URL(start.localLoginUrl).hash.slice('#magic-link='.length);
  const exchange=await api('/admin/auth/exchange',{body:{token}});assert.equal(exchange.status,200);
  cookie=exchange.headers.get('Set-Cookie').split(';')[0];csrf=(await exchange.json()).csrfToken;
  assert.match(exchange.headers.get('Set-Cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await api('/admin/auth/exchange',{body:{token}})).status,401);
  assert.equal((await api('/admin/actions',{auth:true,headers:{'x-dustwave-csrf':''},body:{}})).status,403);
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save();
  const ids=[];
  for(let index=0;index<3;index++){
    const grant=await ok('/uploads',{body:{kind:'pdf',fileName:`Public draft ${index}.pdf`}});
    const uploaded=await mf.dispatchFetch(origin+grant.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':grant.token},body:bytes});
    assert.equal(uploaded.status,200);assert.equal((await uploaded.json()).pages,1);
    const body={title:`Fixture ${index}`,author:`Writer ${index}`,contactName:'Test contact',email:'private@example.test',local:true,consent:true,uploadId:grant.id,uploadToken:grant.token,submissionKey:crypto.randomUUID()};
    const result=await ok('/scripts',{body});ids.push(result.id);
    assert.deepEqual(await ok('/scripts',{body}),result);
    assert.equal((await api('/scripts',{body:{...body,submissionKey:crypto.randomUUID()}})).status,409);
    const publicState=JSON.stringify(await ok('/meetings'));
    assert(!publicState.includes(body.title));assert(!publicState.includes('private@example.test'));
    assert.equal((await api(`/admin/scripts/${result.id}/pdf`)).status,401);
    const download=await api(`/admin/scripts/${result.id}/pdf`,{auth:true});
    assert.equal(download.status,200);assert.match(download.headers.get('Content-Disposition'),/^attachment/);
    assert(download.headers.get('Content-Disposition').includes(encodeURIComponent(`Public draft ${index}.pdf`)));
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);
  }
  for(const id of ids){const state=await ok('/admin/state',{auth:true});await ok('/admin/actions',{auth:true,body:{kind:'script',action:'approve',id,revision:state.revision}});}
  const meetings=(await ok('/meetings')).meetings;
  assert.deepEqual(meetings[0].readings.map(s=>s.title),['Fixture 0','Fixture 1']);assert.equal(meetings[1].readings[0].title,'Fixture 2');
  assert(!JSON.stringify(meetings).includes('pdfId'));assert(!JSON.stringify(meetings).includes('private@example.test'));
  assert(!JSON.stringify(meetings).includes('fileName'));assert(!JSON.stringify(meetings).includes('Public draft'));
  const before=await ok('/admin/state',{auth:true});
  const reorder={kind:'script',action:'reorder',revision:before.revision,ids:[...ids].reverse()};
  const preview=await ok('/admin/actions',{auth:true,body:{...reorder,preview:true}});
  assert.equal(preview.meetings[0].readings[0].title,'Fixture 2');assert.equal((await ok('/admin/state',{auth:true})).revision,before.revision);
  const reordered=await ok('/admin/actions',{auth:true,body:{...reorder,returnState:true}});
  assert.deepEqual(reordered.state,await ok('/admin/state',{auth:true}),'autosave receives the committed queue, scripts, meetings and revision together');
  assert.equal((await api('/admin/actions',{auth:true,body:reorder})).status,409);
  const raceBefore=await loadState(db),a=structuredClone(raceBefore),b=structuredClone(raceBefore);
  a.scripts[0].title='Winning A';b.scripts[0].title='Winning B';
  const results=await Promise.allSettled([commitState(db,raceBefore,a),commitState(db,raceBefore,b)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await loadState(db)).revision,raceBefore.revision+1);
  const html=await (await request('/microcinema.html?month=2026-09')).text();
  assert.match(html,/September 2026 · Dust Wave/);assert.match(html,/data-community-calendar/);assert.match(html,/month=2026-09/);
  assert(!html.includes('private@example.test'));assert(!html.includes('pdfId'));
  assert.equal((await api('/calendar?month=2026-13')).status,400);
  assert.equal((await api('/calendar?month=2026-09&month=2026-10')).status,400);

  await t.test('admins add approved scripts with required private PDFs and optional contact details',async()=>{
    assert.equal((await api('/admin/scripts',{body:{}})).status,401);
    assert.equal((await api('/admin/scripts',{auth:true,body:{},headers:{'x-dustwave-csrf':''}})).status,403);
    const grant=await ok('/admin/uploads',{auth:true,body:{kind:'pdf'}});
    const current=await ok('/admin/state',{auth:true});
    const body={title:'The New Script',author:'María Writer',revision:current.revision,uploadId:grant.id,uploadToken:grant.token,submissionKey:crypto.randomUUID()};
    assert.equal((await api('/admin/scripts',{auth:true,body})).status,409,'an unfinished PDF cannot create a script');
    const invalid=await mf.dispatchFetch(origin+grant.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':grant.token},body:new TextEncoder().encode('not a PDF')});
    assert.equal(invalid.status,400);
    const uploaded=await mf.dispatchFetch(origin+grant.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':grant.token},body:bytes});
    assert.equal(uploaded.status,200);
    assert.equal((await api('/scripts',{body:{...body,admin:true}})).status,400,'public callers cannot bypass consent by claiming to be an admin');
    assert.equal((await api('/scripts',{body:{...body,local:true,consent:true}})).status,400,'public submissions still require contact details');
    const created=await ok('/admin/scripts',{auth:true,body});assert.equal(created.pending,false);
    let saved=await ok('/admin/state',{auth:true});
    assert.deepEqual(saved.queue,[...current.queue,created.id]);
    const script=saved.scripts.find(s=>s.id===created.id);
    assert.equal(script.status,'approved');assert.equal(script.pages,1);assert.equal(script.email,'');assert.equal(script.contactName,'');
    assert.deepEqual(await ok('/admin/scripts',{auth:true,body}),created,'a lost response can be retried without duplicating the script');
    assert.equal((await ok('/admin/state',{auth:true})).revision,saved.revision);
    assert.equal((await api('/admin/scripts',{auth:true,body:{...body,submissionKey:crypto.randomUUID(),revision:saved.revision}})).status,409,'an attached PDF cannot create a second script');
    assert.equal((await api(`/admin/scripts/${created.id}/pdf`)).status,401);
    const download=await api(`/admin/scripts/${created.id}/pdf`,{auth:true});
    assert.equal(download.status,200);assert.match(download.headers.get('Content-Disposition'),/The%20New%20Script%20-%20Mar%C3%ADa%20Writer\.pdf/);
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);

    const nextGrant=await ok('/admin/uploads',{auth:true,body:{kind:'pdf',fileName:'Another Script - draft 1.pdf'}});
    assert.equal((await mf.dispatchFetch(origin+nextGrant.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':nextGrant.token},body:bytes})).status,200);
    const nextBody={...body,title:'Another Script',author:'Another Writer',contactName:'Private Contact',email:'secret@example.test',uploadId:nextGrant.id,uploadToken:nextGrant.token,submissionKey:crypto.randomUUID()};
    assert.equal((await api('/admin/scripts',{auth:true,body:nextBody})).status,409,'stale queue revisions cannot publish');
    assert.equal((await ok('/admin/state',{auth:true})).revision,saved.revision);
    assert.equal((await api('/admin/scripts',{auth:true,body:{...nextBody,revision:saved.revision,email:'invalid'}})).status,400);
    const nextCreated=await ok('/admin/scripts',{auth:true,body:{...nextBody,revision:saved.revision}});
    saved=await ok('/admin/state',{auth:true});
    assert.deepEqual(saved.queue,[...current.queue,created.id,nextCreated.id]);
    const newOrder=[nextCreated.id,created.id,...current.queue];
    const preview=await ok('/admin/actions',{auth:true,body:{kind:'script',action:'reorder',revision:saved.revision,ids:newOrder,preview:true}});
    assert.deepEqual(preview.meetings[0].readings,[{title:'Another Script',author:'Another Writer'},{title:'The New Script',author:'María Writer'}]);
    assert.deepEqual((await ok('/admin/state',{auth:true})).queue,saved.queue);
    await ok('/admin/actions',{auth:true,body:{kind:'script',action:'reorder',revision:saved.revision,ids:newOrder}});
    for(const prefix of ['','/es']){
      const publicHtml=await (await request(`${prefix}/writers-group.html`)).text();
      assert.match(publicHtml,/Another Script/);assert.match(publicHtml,/Another Writer/);assert.match(publicHtml,/María Writer/);
      for(const privateValue of ['secret@example.test','Private Contact','pdfId','fileName','Another Script - draft 1.pdf',nextGrant.id,nextGrant.token,'/admin/scripts/'])assert(!publicHtml.includes(privateValue));
    }
    const publicMeetings=JSON.stringify(await ok('/meetings'));
    for(const privateValue of ['secret@example.test','Private Contact','pdfId','fileName','Another Script - draft 1.pdf',nextGrant.id,nextGrant.token])assert(!publicMeetings.includes(privateValue));

    const replacementName='Guion de María - v2.1.pdf';
    const replacement=await ok('/admin/uploads',{auth:true,body:{kind:'pdf',fileName:replacementName}});
    pdf.addPage();const revisedBytes=await pdf.save();
    assert.equal((await mf.dispatchFetch(origin+replacement.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':replacement.token},body:revisedBytes})).status,200);
    saved=await ok('/admin/state',{auth:true});
    assert.equal((await api('/admin/attach',{auth:true,body:{kind:'script',id:created.id,revision:saved.revision-1,uploadId:replacement.id,uploadToken:replacement.token}})).status,409);
    assert.equal((await ok('/admin/state',{auth:true})).scripts.find(s=>s.id===created.id).fileName,'','a failed replacement retains the prior file metadata');
    await ok('/admin/attach',{auth:true,body:{kind:'script',id:created.id,revision:saved.revision,uploadId:replacement.id,uploadToken:replacement.token}});
    const revised=await api(`/admin/scripts/${created.id}/pdf`,{auth:true});
    assert(revised.headers.get('Content-Disposition').includes(encodeURIComponent(replacementName)));
    assert.deepEqual(new Uint8Array(await revised.arrayBuffer()),revisedBytes);
    saved=await ok('/admin/state',{auth:true});
    assert.equal(saved.scripts.find(s=>s.id===created.id).pages,2);
    assert.equal(saved.scripts.find(s=>s.id===created.id).fileName,replacementName);
    assert.equal(saved.scripts.find(s=>s.id===created.id).title,'The New Script');
    const renamedName='Guion de María - final.pdf';
    const renamed=await ok('/admin/uploads',{auth:true,body:{kind:'pdf',fileName:renamedName}});
    for(let attempt=0;attempt<2;attempt++)assert.equal((await mf.dispatchFetch(origin+renamed.url,{method:'PUT',headers:{Origin:origin,'x-upload-token':renamed.token},body:revisedBytes})).status,200);
    await ok('/admin/attach',{auth:true,body:{kind:'script',id:created.id,revision:saved.revision,uploadId:renamed.id,uploadToken:renamed.token}});
    const renamedDownload=await api(`/admin/scripts/${created.id}/pdf`,{auth:true});
    assert(renamedDownload.headers.get('Content-Disposition').includes(encodeURIComponent(renamedName)),'identical bytes under a new upload name must update the download filename');
    saved=await ok('/admin/state',{auth:true});
    assert.equal(saved.scripts.find(s=>s.id===created.id).fileName,renamedName);
    await ok('/admin/actions',{auth:true,body:{kind:'script',action:'edit',id:nextCreated.id,revision:saved.revision,fields:{title:'Revised Title',author:'Revised Author',contactName:'',email:''}}});
    const edited=(await ok('/admin/state',{auth:true})).scripts.find(s=>s.id===nextCreated.id);
    assert.equal(edited.email,'');assert.equal(edited.contactName,'');
    const editedDownload=await api(`/admin/scripts/${nextCreated.id}/pdf`,{auth:true});
    assert(editedDownload.headers.get('Content-Disposition').includes(encodeURIComponent('Another Script - draft 1.pdf')),'editing metadata must not rename the uploaded PDF');
    assert.deepEqual((await ok('/meetings')).meetings[0].readings[0],{title:'Revised Title',author:'Revised Author'});
  });
  await t.test('event and meeting CRUD updates both public projections and persists deletion through the daily trigger',async()=>{
    const fields={title:'Added meeting',description:'An extra script reading.',date:'2026-09-14',time:'19:00',endTime:'21:00'};
    async function action(body){const current=await ok('/admin/state',{auth:true});return ok('/admin/actions',{auth:true,body:{kind:'event',revision:current.revision,...body,returnState:true}});}
    let result=await action({action:'create_meeting',fields});
    const meeting=result.state.events.find(e=>e.title===fields.title);
    assert.equal(meeting.status,'published');assert.equal(meeting.readings.length,2);
    for(const endpoint of ['/meetings','/calendar?month=2026-09'])assert(JSON.stringify(await ok(endpoint)).includes('Added meeting'));
    await action({action:'edit',id:meeting.id,fields:{...fields,title:'Edited meeting',time:'18:00',endTime:'20:00'}});
    for(const prefix of ['','/es'])for(const page of ['/writers-group.html','/microcinema.html?month=2026-09']){
      const html=await(await request(prefix+page)).text();
      if(page.includes('microcinema')){assert.match(html,/Edited meeting/);assert.doesNotMatch(html,/Added meeting/);}
      else {assert.match(html,/datetime="2026-09-14"/);assert.match(html,/6:00|18:00/);}
    }
    result=await action({action:'create_event',fields:{...fields,title:'Public screening'}});
    const event=result.state.events.find(e=>e.title==='Public screening');
    assert.equal((await api('/admin/actions',{auth:true,body:{kind:'event',revision:result.revision,id:event.id,action:'approve'}})).status,400,'ordinary events still require their square artwork');
    // The image pipeline is covered in files.test; seed its attached result here.
    const before=await loadState(db),after=structuredClone(before);
    after.events.find(e=>e.id===event.id).imageId=crypto.randomUUID();
    await commitState(db,before,after);
    await action({action:'approve',id:event.id});
    assert(JSON.stringify(await ok('/calendar?month=2026-09')).includes('Public screening'));
    await action({action:'cancel',id:'writers-2026-09-21'});
    for(const id of [meeting.id,event.id,'writers-2026-09-21']){
      const current=await ok('/admin/state',{auth:true});
      assert.equal((await api('/admin/actions',{auth:true,body:{kind:'event',id,action:'delete',revision:current.revision-1}})).status,409);
      result=await action({action:'delete',id});assert(!result.state.events.some(e=>e.id===id));
    }
    await mf.getWorker().then(worker=>worker.scheduled({cron:'15 7 * * *'}));
    const saved=await loadState(db);assert.equal(saved.events.find(e=>e.id==='writers-2026-09-21').status,'deleted');
    const publicMeetings=(await ok('/meetings')).meetings;
    assert.equal(publicMeetings[0].date,'2026-10-05');assert.equal(publicMeetings[0].readings.length,2);
    for(const endpoint of ['/meetings','/calendar?month=2026-09']){
      const data=JSON.stringify(await ok(endpoint));
      for(const title of ['Added meeting','Edited meeting','Public screening','writers-2026-09-21'])assert(!data.includes(title));
    }
    for(const prefix of ['','/es'])for(const page of ['/writers-group.html','/microcinema.html?month=2026-09']){
      const html=await(await request(prefix+page)).text();assert.doesNotMatch(html,/Edited meeting|Public screening/);
      if(page.includes('writers-group'))assert.doesNotMatch(html,/datetime="2026-09-(14|21)"/);
    }
    assert.equal((await api('/admin/actions',{auth:true,body:{kind:'event',action:'approve',id:meeting.id,revision:saved.revision}})).status,404,'deleted meetings cannot be restored through stale controls');
  });
  await ok('/admin/logout',{auth:true,body:{}});assert.equal((await api('/admin/state',{auth:true})).status,401);
});
