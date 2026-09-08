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
    d1Databases:['COMMUNITY_DB'],r2Buckets:['COMMUNITY_FILES'],bindings:{SITE_BASE:origin,APP_MODE:'local',LOCAL_CHALLENGE_BYPASS:'true',COMMUNITY_ADMIN_EMAILS:'admin@example.test'},
    serviceBindings:{SITE_ASSETS:()=>new Response('<html><head><title>Calendar</title><meta property="og:image" content="default"><link rel="canonical" href="default"></head><body><section data-community-slot="1">Unavailable</section></body></html>',{headers:{'Content-Type':'text/html'}})}}]}));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('COMMUNITY_DB');
  for(const name of ['0001_community.sql','0002_initial_meetings.sql']){
    const sql=(await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8')).replace(/^--.*$/gm,'');
    await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  }
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
    const grant=await ok('/uploads',{body:{kind:'pdf'}});
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
    assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);
  }
  for(const id of ids){const state=await ok('/admin/state',{auth:true});await ok('/admin/actions',{auth:true,body:{kind:'script',action:'approve',id,revision:state.revision}});}
  const meetings=(await ok('/meetings')).meetings;
  assert.deepEqual(meetings[0].readings.map(s=>s.title),['Fixture 0','Fixture 1']);assert.equal(meetings[1].readings[0].title,'Fixture 2');
  assert(!JSON.stringify(meetings).includes('pdfId'));assert(!JSON.stringify(meetings).includes('private@example.test'));
  const before=await ok('/admin/state',{auth:true});
  const reorder={kind:'script',action:'reorder',revision:before.revision,ids:[...ids].reverse()};
  const preview=await ok('/admin/actions',{auth:true,body:{...reorder,preview:true}});
  assert.equal(preview.meetings[0].readings[0].title,'Fixture 2');assert.equal((await ok('/admin/state',{auth:true})).revision,before.revision);
  await ok('/admin/actions',{auth:true,body:reorder});
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
  await ok('/admin/logout',{auth:true,body:{}});assert.equal((await api('/admin/state',{auth:true})).status,401);
});
