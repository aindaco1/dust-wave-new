import {migrateFixture} from '../workers/community/test/fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import nunjucks from 'nunjucks';
import * as sass from 'sass';
import puppeteer from 'puppeteer';

const root=new URL('../',import.meta.url),workerRequire=createRequire(new URL('workers/community/package.json',root));
const {build}=workerRequire('esbuild'),{Miniflare,convertV4MiniflareOptions}=workerRequire('miniflare'),{PDFDocument}=workerRequire('pdf-lib');
const read=file=>readFile(new URL(file,root),'utf8');
const template=matter(await read('src/admin/community/index.njk')).content;
const i18n=Object.fromEntries(await Promise.all(['en','es'].map(async lang=>[lang,JSON.parse(await read(`src/_data/i18n/${lang}.json`))])));
const renderer=new nunjucks.Environment(null,{autoescape:true});
renderer.addFilter('safeJsonLd',value=>JSON.stringify(value).replace(/</g,'\\u003c'));
const styles=['theme','community-admin'].map(name=>sass.compile(fileURLToPath(new URL(`src/scss/${name}.scss`,root)),{logger:sass.Logger.silent}).css).join('\n');
const assets=new Map();
for(const [prefix,directory] of [['/js/community/','src/js/community/'],['/js/dust-wave-admin-shell/','shared/dust-wave-platform/packages/admin-shell/src/'],['/fonts/','src/fonts/']]){
  for(const file of await readdir(new URL(directory,root)))if(/\.(js|woff2?)$/.test(file))assets.set(prefix+file,await readFile(new URL(directory+file,root)));
}
const bundle=await build({stdin:{contents:"const RealDate=Date; globalThis.Date=class extends RealDate { constructor(...args){super(...(args.length?args:['2026-09-10T12:00:00Z']));} static now(){return +new RealDate('2026-09-10T12:00:00Z');} }; import {createApp} from './src/app.js'; export default createApp({card:async()=>'/fixture-card.png'});",resolveDir:fileURLToPath(new URL('workers/community/',root))},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const directory=await mkdtemp(path.join(os.tmpdir(),'dust-wave-admin-test-'));
const pdf=await PDFDocument.create();pdf.addPage();const pdfBytes=await pdf.save();pdf.addPage();const revisedBytes=await pdf.save();
const pdfName='Script - draft 1.pdf',revisedName=`Guion_de_María_versión_2.1_${'x'.repeat(70)}.pdf`;
const pdfPath=path.join(directory,pdfName),revisedPath=path.join(directory,revisedName),invalidPath=path.join(directory,'invalid.pdf');
await Promise.all([writeFile(pdfPath,pdfBytes),writeFile(revisedPath,revisedBytes),writeFile(invalidPath,'Not a PDF')]);
let mf,origin,loseNextCreateResponse=false,failNextState=false,nextActionMode='',releaseAction,actionCalls=0,stateReads=0,holdNextState=false,releaseState,nextUsersMode='';
const runtimes=new Set();
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,origin);
    if(url.pathname.startsWith('/api/community/')){
      if(url.pathname.endsWith('/admin/state'))stateReads++;
      if(failNextState&&url.pathname.endsWith('/admin/state')){failNextState=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"request_failed"}');return;}
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const action=url.pathname.endsWith('/admin/actions');
      const userSave=url.pathname.endsWith('/admin/users')&&req.method==='POST';
      const mode=action?nextActionMode:userSave?nextUsersMode:'';
      if(userSave)nextUsersMode='';
      if(action){nextActionMode='';actionCalls++;}
      if(mode==='hold')await new Promise(resolve=>{releaseAction=()=>{releaseAction=null;resolve();};});
      if(mode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"request_failed"}');return;}
      const response=await mf.dispatchFetch(url.href,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});
      if(holdNextState&&url.pathname.endsWith('/admin/state')){holdNextState=false;await new Promise(resolve=>{releaseState=()=>{releaseState=null;resolve();};});}
      if(mode==='lose'&&response.ok){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"request_failed"}');return;}
      if(loseNextCreateResponse&&url.pathname.endsWith('/admin/scripts')&&response.ok){loseNextCreateResponse=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"request_failed"}');return;}
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(assets.has(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'font/woff2');res.end(assets.get(url.pathname));return;}
    if(url.pathname==='/theme.css'){res.setHeader('Content-Type','text/css');res.end(styles);return;}
    if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
    const language=url.pathname.startsWith('/es/')?'es':'en';
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="${language}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/theme.css"></head><body class="community-admin-shell"><main class="container community-admin">${renderer.renderString(template,{language,i18n})}</main><script type="module" src="/js/community/admin.js"></script></body></html>`);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;
// CI uses Xvfb: Linux headless Chrome can report no mouse or hover capability.
const browser=await puppeteer.launch({headless:process.env.COMMUNITY_BROWSER_HEADED!=='true',args:process.env.CI?['--no-sandbox']:[]});
const screenshots=process.env.COMMUNITY_ADMIN_SCREENSHOTS;
if(screenshots)await mkdir(screenshots,{recursive:true});

async function selectTab(page,name){
  const mobile=await page.$('.community-admin__mobile-tabs select');
  if(await mobile.isVisible())await mobile.select(name);
  else await page.click(`#community-tab-${name}`);
  await page.waitForFunction(name=>!document.querySelector(`#community-${name}`).hidden,{},name);
}
async function fixture(lang='en',width=1440,{role='super_admin'}={}){
  loseNextCreateResponse=false;
  failNextState=false;
  nextActionMode='';releaseAction=null;actionCalls=0;stateReads=0;holdNextState=false;releaseState=null;nextUsersMode='';
  mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'community-browser',modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-09-07',d1Databases:['COMMUNITY_DB'],r2Buckets:['COMMUNITY_FILES'],bindings:{SITE_BASE:origin,APP_MODE:'local',LOCAL_CHALLENGE_BYPASS:'true'}}]}));
  runtimes.add(mf);
  const db=await mf.getD1Database('COMMUNITY_DB');
  await migrateFixture(db);
  if(role==='limited_admin')await db.prepare('UPDATE community_admin_directory SET users=? WHERE id=1').bind(JSON.stringify([{name:'Test owner',email:'owner@example.test',role:'super_admin'},{name:'Test admin',email:'admin@example.test',role}])).run();
  const start=await mf.dispatchFetch(`${origin}/api/community/v1/admin/auth/start`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@example.test'})});
  const token=new URL((await start.json()).localLoginUrl).hash;
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width,height:1000});
  await page.setRequestInterception(true);
  page.on('request',request=>request.url().startsWith(origin)||request.url().startsWith('blob:')?request.continue():request.abort());
  await page.evaluateOnNewDocument(()=>{
    const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-09-10T12:00:00Z']));}static now(){return +new RealDate('2026-09-10T12:00:00Z');}};
    const interval=window.setInterval;window.setInterval=(callback,delay,...args)=>{if(delay===30000)window.checkCommunityUpdates=callback;return interval(callback,delay,...args);};
    const click=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){
      if(this.href.startsWith('blob:')){const filename=this.download;window.lastDownload=null;fetch(this.href).then(r=>r.arrayBuffer()).then(bytes=>{window.lastDownload={filename,bytes:[...new Uint8Array(bytes)]};});return;}
      return click.call(this);
    };
  });
  await page.goto(`${origin}/${lang==='es'?'es/':''}admin/community/${token}`);
  await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');
  await selectTab(page,'queue');
  await page.waitForNetworkIdle({idleTime:50});
  return {page,db,copy:i18n[lang].community,async close(){assert.deepEqual(errors,[]);await context.close();await mf.dispose();runtimes.delete(mf);}};
}
const titles=page=>page.$$eval('[data-admin-queue] strong',nodes=>nodes.map(node=>node.textContent));
const readings=page=>page.evaluate(async()=>{const result=await(await fetch('/api/community/v1/meetings')).json();return result.meetings[0].readings;});
async function openScript(page,title,author,file=pdfPath){
  await page.click('[data-admin-add-script]');await page.waitForSelector('[data-admin-editor][open]');
  await page.type('[name="title"]',title);await page.type('[name="author"]',author);
  if(file)await(await page.$('[name="file"]')).uploadFile(file);
}
async function saveScript(page,count){await page.click('[data-admin-editor-form] [type="submit"]');await page.waitForSelector('[data-admin-editor]:not([open])');await page.waitForFunction(count=>document.querySelectorAll('[data-admin-queue] strong').length===count,{},count);}
async function fits(page){
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits its viewport');
  assert(await page.$eval('[data-admin-editor]',node=>!node.open||(node.scrollWidth<=node.clientWidth&&node.getBoundingClientRect().right<=innerWidth)),'editor fits its viewport');
}
async function waitForHeldAction(){
  const deadline=Date.now()+5000;
  while(!releaseAction&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert(releaseAction,'the autosave request reached the server');
}
try{
  for(const [lang,width] of [['en',1440],['en',768],['es',768],['es',320]])await test(`event and meeting creation, editing and deletion (${lang}, ${width}px)`,async()=>{
    const f=await fixture(lang,width),{page,copy}=f;
    try{
      await openScript(page,'Queued script','Queue author');await saveScript(page,1);
      await selectTab(page,'meetings');
      assert.equal(await page.$('[data-admin-refresh]'),null);
      assert.equal(await(await page.$('[data-admin-create]')).isVisible(),false);
      await page.click('[data-admin-add-meeting]');await page.waitForSelector('[data-admin-editor][open]');
      assert.equal(await page.$eval('[name="time"]',node=>node.value),'19:00');
      async function fields(values){await page.evaluate(values=>{for(const [key,value] of Object.entries(values)){const input=document.querySelector(`[data-admin-editor-form] [name="${key}"]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}},values);}
      async function save(){await page.click('[data-admin-editor-form] [type="submit"]');await page.waitForSelector('[data-admin-editor]:not([open])');}
      async function action(title,label){
        const button=await page.evaluateHandle((title,label)=>{
          const card=[...document.querySelectorAll('.community-admin-card')].find(card=>card.querySelector('h3')?.textContent===title);
          return [...card.querySelectorAll('button')].find(node=>node.textContent===label);
        },title,label);
        assert(button.asElement(),`Missing ${label} on ${title}`);await button.asElement().click();await button.dispose();
      }
      async function confirmDelete(title,selector){
        await action(title,copy.deleteEvent);
        await page.waitForFunction(()=>[...document.querySelectorAll('dialog[open]')].some(dialog=>!dialog.hasAttribute('data-admin-editor')));
        const confirm=await page.evaluateHandle(label=>[...document.querySelectorAll('dialog[open] button')].find(node=>node.textContent===label),copy.deleteEvent);
        await confirm.asElement().click();await confirm.dispose();
        await page.waitForFunction((selector,title)=>![...document.querySelectorAll(selector+' h3')].some(node=>node.textContent===title),{},selector,title);
      }
      await fields({title:'Extra reading',date:'2026-09-14'});await fits(page);await save();
      await page.waitForFunction(()=>document.querySelector('[data-admin-meetings]').textContent.includes('Extra reading'));
      assert.deepEqual(await readings(page),[{title:'Queued script',author:'Queue author'}]);
      await action('Extra reading',copy.edit);await fields({title:'Revised reading',date:'2026-09-28',time:'18:00',endTime:'20:00'});await save();
      await page.waitForFunction(()=>document.querySelector('[data-admin-meetings]').textContent.includes('Revised reading'));
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${lang}-${width}-meetings.png`),fullPage:true});
      await confirmDelete('Revised reading','[data-admin-meetings]');
      const ids=await page.evaluate(async()=>{const [meetings,calendar]=await Promise.all(['/meetings','/calendar?month=2026-09'].map(path=>fetch('/api/community/v1'+path).then(r=>r.json())));return [...meetings.meetings,...calendar.events].map(e=>e.title);});
      assert(!ids.includes('Extra reading'));assert(!ids.includes('Revised reading'));
      await selectTab(page,'events');await page.click('[data-admin-create]');
      await fields({title:'New screening',description:'A one-night screening.',date:'2026-09-18',time:'20:00'});await fits(page);await save();
      await page.waitForFunction(()=>document.querySelector('[data-admin-events]').textContent.includes('New screening'));
      await action('New screening',copy.edit);await fields({title:'Edited screening'});await save();
      await page.waitForFunction(()=>document.querySelector('[data-admin-events]').textContent.includes('Edited screening'));
      await confirmDelete('Edited screening','[data-admin-events]');
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');
      assert(!await page.$eval('[data-admin-events]',node=>node.textContent.includes('Edited screening')));
      await selectTab(page,'meetings');assert(!await page.$eval('[data-admin-meetings]',node=>node.textContent.includes('Revised reading')));
    }finally{await f.close();}
  });
  for(const lang of ['en','es'])for(const width of [1440,768,320])await test(`admin adds, reorders and manages private scripts at ${width}px (${lang})`,async()=>{
    const f=await fixture(lang,width),{page,copy}=f;
    try{
      for(let i=1;i<=3;i++){
        await openScript(page,`Script ${i}`,`Writer ${i}`,i===1?null:pdfPath);
        if(i===1){
          assert.equal(await page.$eval('[name="file"]',node=>node.required),true);
          await page.click('[data-admin-editor-form] [type="submit"]');assert.deepEqual(await titles(page),[]);
          await(await page.$('[name="file"]')).uploadFile(pdfPath);
          await fits(page);
          if(screenshots)await page.screenshot({path:path.join(screenshots,`${lang}-${width}-add.png`),fullPage:true});
        }
        if(i===2){await page.type('[name="contactName"]','Private Contact');await page.type('[name="email"]','private@example.test');}
        await saveScript(page,i);
      }
      assert.deepEqual(await titles(page),['Script 1','Script 2','Script 3']);
      assert.deepEqual(await readings(page),[{title:'Script 1',author:'Writer 1'},{title:'Script 2',author:'Writer 2'}]);
      await page.focus(`[aria-label="${copy.moveUp}: Script 3"]`);await page.keyboard.press('Enter');
      assert.deepEqual(await titles(page),['Script 1','Script 3','Script 2']);
      await page.evaluate(()=>{
        const rows=document.querySelectorAll('[data-queue-id]'),dataTransfer=new DataTransfer();
        rows[2].querySelector('[data-queue-drag]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));rows[0].dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer}));
      });
      assert.deepEqual(await titles(page),['Script 2','Script 1','Script 3']);
      await page.waitForFunction(message=>document.querySelector('[data-queue-status]').textContent===message,{},copy.actionDone);
      assert.equal(await page.$('[data-admin-save-queue]'),null);
      assert.deepEqual(await readings(page),[{title:'Script 2',author:'Writer 2'},{title:'Script 1',author:'Writer 1'}]);
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');await selectTab(page,'queue');
      assert.deepEqual(await titles(page),['Script 2','Script 1','Script 3']);await fits(page);
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${lang}-${width}-queue.png`),fullPage:true});
      const firstRow=()=>page.$('[data-admin-queue] li:first-child');
      const clickAction=async label=>{const buttons=await(await firstRow()).$$('button');for(const button of buttons)if(await button.evaluate((node,label)=>node.textContent===label,label)){await button.click();return;}throw new Error('Missing action: '+label);};
      await clickAction(copy.download);await page.waitForFunction(()=>window.lastDownload);
      assert.equal(await page.$eval('[data-admin-queue] li:first-child [data-script-filename]',node=>node.textContent),pdfName);
      let download=await page.evaluate(()=>window.lastDownload);assert.equal(download.filename,pdfName);assert.deepEqual(download.bytes,[...pdfBytes]);
      const [chooser]=await Promise.all([page.waitForFileChooser(),clickAction(copy.replacePdf)]);await chooser.accept([revisedPath]);
      await page.waitForFunction(pages=>document.querySelector('[data-admin-queue] li p').textContent.endsWith(`2 ${pages}`),{},copy.pages);
      assert.equal(await page.$eval('[data-admin-queue] li:first-child [data-script-filename]',node=>node.textContent),revisedName);
      await fits(page);
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${lang}-${width}-replacement.png`),fullPage:true});
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');await selectTab(page,'queue');
      await page.evaluate(()=>{window.lastDownload=null;});await clickAction(copy.download);await page.waitForFunction(()=>window.lastDownload);
      download=await page.evaluate(()=>window.lastDownload);assert.equal(download.filename,revisedName);assert.deepEqual(download.bytes,[...revisedBytes]);
      await clickAction(copy.edit);await page.waitForSelector('[data-admin-editor][open]');
      await page.$eval('[name="title"]',node=>{node.value='Revised Script';node.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.$eval('[name="email"]',node=>{node.value='';node.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.waitForFunction(message=>document.querySelector('[data-editor-status]').textContent===message,{},copy.actionDone);
      assert.equal(await page.$eval('[data-admin-editor-form] [type="submit"]',node=>node.hidden),true);
      await page.click('[data-editor-close]');await page.waitForSelector('[data-admin-editor]:not([open])');
      assert.equal((await readings(page))[0].title,'Revised Script');
      assert.equal(await page.$eval('[data-admin-queue] li:first-child [data-script-filename]',node=>node.textContent),revisedName,'editing the public title leaves the uploaded filename intact');
    }finally{await f.close();}
  });
  await test('admin drafts retain their PDF through validation, stale revisions and a lost create response',async()=>{
    const f=await fixture('en',390),{page,copy,db}=f;
    try{
      await openScript(page,'Retained Script','Retained Author',invalidPath);
      await page.click('[data-admin-editor-form] [type="submit"]');await page.waitForFunction(message=>document.querySelector('[data-editor-status]').textContent===message,{},copy.errors.invalid_pdf);
      assert.equal(await page.$eval('[name="title"]',node=>node.value),'Retained Script');assert.deepEqual(await titles(page),[]);
      await(await page.$('[name="file"]')).uploadFile(pdfPath);
      await db.prepare('UPDATE community_meta SET revision=revision+1 WHERE id=1').run();
      loseNextCreateResponse=true;
      await page.click('[data-admin-editor-form] [type="submit"]');await page.waitForFunction(message=>document.querySelector('[data-editor-status]').textContent===message,{},copy.errors.request_failed);
      assert.equal(await page.$eval('[name="file"]',node=>node.files[0].name),pdfName);
      await saveScript(page,1);assert.deepEqual(await titles(page),['Retained Script']);
      assert.equal((await db.prepare("SELECT count(*) AS count FROM community_records WHERE kind='script'").first()).count,1);
      await openScript(page,'Saved Script','Saved Author');failNextState=true;
      await page.click('[data-admin-editor-form] [type="submit"]');
      await page.waitForFunction(message=>document.querySelector('[data-admin-status]').textContent===message,{},copy.savedRefreshFailed);
      assert.equal(await page.$eval('[data-admin-editor]',node=>node.open),false);
      await page.evaluate(()=>dispatchEvent(new Event('online')));await page.waitForFunction(()=>document.querySelectorAll('[data-admin-queue] strong').length===2);
      assert.deepEqual(await titles(page),['Retained Script','Saved Script']);
    }finally{await f.close();}
  });
  await test('script autosave serializes rapid changes and recovers from failed or lost responses',async()=>{
    const f=await fixture('en',390),{page,copy}=f;
    const waitSaved=selector=>page.waitForFunction((selector,message)=>document.querySelector(selector).textContent===message,{},selector,copy.actionDone);
    const setField=(name,value)=>page.$eval(`[name="${name}"]`,(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},value);
    try{
      for(let i=1;i<=3;i++){await openScript(page,`Script ${i}`,`Writer ${i}`);await saveScript(page,i);}
      nextActionMode='hold';
      await page.click(`[aria-label="${copy.moveUp}: Script 3"]`);
      await waitForHeldAction();
      await page.click(`[aria-label="${copy.moveUp}: Script 3"]`);
      assert.deepEqual(await titles(page),['Script 3','Script 1','Script 2']);
      assert.equal(actionCalls,1,'rapid moves wait for the first revision');
      assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;}),true);
      releaseAction();await waitSaved('[data-queue-status]');assert.equal(actionCalls,2);
      assert.deepEqual(await readings(page),[{title:'Script 3',author:'Writer 3'},{title:'Script 1',author:'Writer 1'}]);
      nextActionMode='fail';await page.click(`[aria-label="${copy.moveDown}: Script 3"]`);
      await page.waitForSelector('[data-queue-retry]:not([hidden])');
      assert.equal((await readings(page))[0].title,'Script 3','a failed autosave cannot alter the public queue');
      assert.deepEqual(await titles(page),['Script 1','Script 3','Script 2'],'the requested order is retained for retry');
      await page.click('[data-queue-retry]');await waitSaved('[data-queue-status]');
      nextActionMode='lose';await page.click(`[aria-label="${copy.moveUp}: Script 2"]`);await waitSaved('[data-queue-status]');
      assert.deepEqual(await readings(page),[{title:'Script 1',author:'Writer 1'},{title:'Script 2',author:'Writer 2'}]);
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');await selectTab(page,'queue');
      assert.deepEqual(await titles(page),['Script 1','Script 2','Script 3']);
      await page.$$eval('[data-admin-queue] li:first-child button',(nodes,label)=>nodes.find(node=>node.textContent===label).click(),copy.edit);
      await page.waitForSelector('[data-admin-editor][open]');
      nextActionMode='hold';await setField('title','First title');
      await waitForHeldAction();
      await setField('title','Final title');await setField('author','Final author');await setField('contactName','Private contact');await setField('email','contact@example.test');
      releaseAction();await waitSaved('[data-editor-status]');
      assert.deepEqual((await readings(page))[0],{title:'Final title',author:'Final author'});
      nextActionMode='fail';await setField('contactName','Retained contact');await page.waitForSelector('[data-editor-retry]:not([hidden])');
      assert.equal(await page.$eval('[name="contactName"]',node=>node.value),'Retained contact');
      await page.click('[data-editor-retry]');await waitSaved('[data-editor-status]');
      nextActionMode='lose';await setField('title','Recovered title');await waitSaved('[data-editor-status]');
      await setField('author','');await page.waitForFunction(message=>document.querySelector('[data-editor-status]').textContent===message,{},copy.autosaveInvalid);
      assert.equal((await readings(page))[0].author,'Final author','invalid intermediate fields stay private drafts');
      await setField('author','Closing author');await page.click('[data-editor-close]');await page.waitForSelector('[data-admin-editor]:not([open])');
      assert.deepEqual((await readings(page))[0],{title:'Recovered title',author:'Closing author'},'closing flushes the debounce timer');
      assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;}),false);
    }finally{releaseAction?.();await f.close();}
  });
  await test('autosave retains conflicting drafts without overwriting another admin',async()=>{
    const f=await fixture('en',390),{page,copy,db}=f;
    const externalState=async()=>{const rows=await db.prepare("SELECT id,data FROM community_records WHERE kind='script'").all();return rows.results.map(row=>JSON.parse(row.data));};
    try{
      for(let i=1;i<=3;i++){await openScript(page,`Script ${i}`,`Writer ${i}`);await saveScript(page,i);}
      const records=await externalState();
      await db.batch(records.map(record=>db.prepare('UPDATE community_records SET data=? WHERE id=?').bind(JSON.stringify({...record,position:4-record.position}),record.id)).concat(db.prepare('UPDATE community_meta SET revision=revision+1 WHERE id=1')));
      await page.click(`[aria-label="${copy.moveUp}: Script 2"]`);await page.waitForSelector('[data-queue-retry]:not([hidden])');
      assert((await page.$eval('[data-queue-status]',node=>node.textContent)).includes(copy.errors.queue_changed));
      assert.deepEqual(await titles(page),['Script 2','Script 1','Script 3']);
      assert.equal((await externalState()).find(record=>record.title==='Script 1').position,4-records.find(record=>record.title==='Script 1').position);
      page.once('dialog',dialog=>dialog.accept());await page.click('[data-queue-discard]');await page.waitForFunction(()=>document.querySelector('[data-admin-queue] strong').textContent==='Script 3');
      await page.$$eval('[data-admin-queue] li:first-child button',(nodes,label)=>nodes.find(node=>node.textContent===label).click(),copy.edit);
      await page.waitForSelector('[data-admin-editor][open]');
      const record=(await externalState()).find(record=>record.title==='Script 3');
      await db.batch([db.prepare('UPDATE community_records SET data=? WHERE id=?').bind(JSON.stringify({...record,author:'Another admin author'}),record.id),db.prepare('UPDATE community_meta SET revision=revision+1 WHERE id=1')]);
      await page.$eval('[name="author"]',node=>{node.value='My author';node.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.waitForSelector('[data-editor-refresh]:not([hidden])');
      assert.equal(await page.$eval('[name="author"]',node=>node.value),'My author');
      assert.equal((await externalState()).find(row=>row.id===record.id).author,'Another admin author');
      page.once('dialog',dialog=>dialog.accept());await page.click('[data-editor-refresh]');
      await page.waitForFunction(()=>document.querySelector('[name="author"]').value==='Another admin author');
      await page.click('[data-editor-close]');await page.waitForSelector('[data-admin-editor]:not([open])');
    }finally{await f.close();}
  });
  await test('admin navigation remembers its section and adapts between keyboard tabs and the mobile picker',async()=>{
    const f=await fixture('en',1440),{page}=f;
    try{
      assert.equal(await page.$('[data-admin-refresh]'),null);
      assert.equal(await(await page.$('[data-admin-create]')).isVisible(),false);
      await page.focus('#community-tab-queue');await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('#community-meetings',node=>node.hidden),false);
      await page.keyboard.press('Home');
      assert.equal(await(await page.$('[data-admin-create]')).isVisible(),true);
      assert.equal(await page.$eval('[data-admin-create]',node=>node.closest('[role="tabpanel"]').id),'community-events');
      await page.setViewport({width:320,height:1000});
      assert.equal(await page.$eval('.community-admin__mobile-tabs select',node=>node.value),'events');
      await selectTab(page,'meetings');await fits(page);
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');
      assert.equal(await page.$eval('#community-meetings',node=>node.hidden),false);
      assert.equal(await page.$eval('.community-admin__mobile-tabs select',node=>node.value),'meetings');
      await page.setViewport({width:1440,height:1000});
      assert.equal(await page.$eval('#community-tab-meetings',node=>node.getAttribute('aria-selected')),'true');
    }finally{await f.close();}
  });
  await test('automatic updates preserve drafts and focus, recover from disconnects and ignore stale reads',async()=>{
    const f=await fixture('en',1440),{page,copy,db}=f;
    const update=async title=>{
      const row=await db.prepare("SELECT id,data FROM community_records WHERE kind='script' ORDER BY id LIMIT 1").first();
      await db.batch([db.prepare('UPDATE community_records SET data=? WHERE id=?').bind(JSON.stringify({...JSON.parse(row.data),title}),row.id),db.prepare('UPDATE community_meta SET revision=revision+1 WHERE id=1')]);
    };
    const check=async trigger=>{
      await page.evaluate(trigger=>trigger==='timer'?window.checkCommunityUpdates():dispatchEvent(new Event(trigger)),trigger);
      await page.waitForNetworkIdle({idleTime:50});
    };
    try{
      await openScript(page,'First script','First writer');await saveScript(page,1);
      await page.waitForNetworkIdle({idleTime:50});
      await page.$$eval('[data-admin-queue] li button',(nodes,label)=>nodes.find(node=>node.textContent===label).focus(),copy.edit);
      await page.evaluate(()=>{window.originalQueueRow=document.querySelector('[data-queue-id]');});
      await check('focus');
      assert.equal(await page.evaluate(()=>window.originalQueueRow===document.querySelector('[data-queue-id]')),true,'unchanged data keeps the existing DOM');
      await update('Remote title');await check('timer');
      assert.deepEqual(await titles(page),['Remote title']);
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),copy.edit,'an updated row retains keyboard focus');
      await page.keyboard.press('Enter');await page.waitForSelector('[data-admin-editor][open]');
      await update('Newer remote title');const before=stateReads;
      await check('focus');await check('timer');
      assert.equal(stateReads,before,'an open editor blocks background reads');
      assert.equal(await page.$eval('[name="title"]',node=>node.value),'Remote title');
      await page.click('[data-editor-close]');await page.waitForFunction(()=>document.querySelector('[data-admin-queue] strong').textContent==='Newer remote title');
      failNextState=true;await check('online');
      assert.equal(await page.$eval('[data-sync-status]',node=>node.textContent),copy.syncFailed);
      await update('Reconnected title');await check('online');
      assert.deepEqual(await titles(page),['Reconnected title']);assert.equal(await page.$eval('[data-sync-status]',node=>node.textContent),'');
      holdNextState=true;await page.evaluate(()=>dispatchEvent(new Event('focus')));
      const deadline=Date.now()+5000;while(!releaseState&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
      assert(releaseState,'an older read is waiting while a newer edit commits');
      await page.$$eval('[data-admin-queue] li button',(nodes,label)=>nodes.find(node=>node.textContent===label).click(),copy.edit);
      await page.$eval('[name="title"]',node=>{node.value='My saved title';node.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.waitForFunction(message=>document.querySelector('[data-editor-status]').textContent===message,{},copy.actionDone);
      await page.click('[data-editor-close]');releaseState();await page.waitForNetworkIdle({idleTime:50});
      assert.deepEqual(await titles(page),['My saved title'],'a late read cannot replace a newer committed revision');
      await openScript(page,'Another script','Another writer');await saveScript(page,2);
      nextActionMode='fail';await page.click(`[aria-label="${copy.moveUp}: Another script"]`);await page.waitForSelector('[data-queue-retry]:not([hidden])');
      const failedOrder=await titles(page),failedReads=stateReads;await check('focus');await check('timer');
      assert.equal(stateReads,failedReads);assert.deepEqual(await titles(page),failedOrder,'an unsaved order stays available for retry');
      await page.click('[data-queue-retry]');await page.waitForFunction(message=>document.querySelector('[data-queue-status]').textContent===message,{},copy.actionDone);
      await page.waitForNetworkIdle({idleTime:50});failNextState=true;await page.reload();
      await page.waitForFunction(message=>document.querySelector('[data-admin-status]').textContent===message,{},copy.errors.request_failed);
      assert.equal(await page.$eval('[data-admin-workspace]',node=>node.inert),true,'controls wait for the initial state');
      await check('online');
      await page.waitForSelector('[data-admin-workspace][aria-busy="false"]');
      assert.equal(await page.$eval('[data-admin-workspace]',node=>node.inert),false);
      assert.deepEqual(await titles(page),failedOrder,'initial load failures recover without another sign-in or manual refresh');
    }finally{releaseState?.();await f.close();}
  });
  for(const [lang,width]of [['en',1440],['en',768],['es',768],['es',320]])await test(`Super-admin user editing, validation and saved access (${lang}, ${width}px)`,async()=>{
    const f=await fixture(lang,width),{page,copy,db}=f;
    const field=(name,value)=>page.$eval(`[data-user-card]:first-child [name=${name}]`,(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));},value);
    const save=async()=>{await page.click('[data-users-save]');await page.waitForFunction(message=>document.querySelector('[data-users-status]').textContent===message,{},copy.usersSaved);};
    try{
      await selectTab(page,'users');await page.waitForSelector('[data-user-card]');
      assert.equal(await page.$eval('[data-user-card] [name=email]',node=>node.readOnly),true);
      assert.equal(await page.$eval('[data-user-card] [name=role]',node=>node.disabled),true);
      assert.equal(await page.$eval('[data-user-card] button',node=>node.disabled),true);
      await page.click('[data-user-add]');assert.equal(await page.$eval('[data-user-card] [name=role]',node=>node.value),'limited_admin');
      await field('name','New reader');await field('email','ADMIN@EXAMPLE.TEST');
      await page.click('[data-users-save]');await page.waitForFunction(message=>document.querySelector('[data-users-status]').textContent===message,{},copy.errors.duplicate_user_email);
      assert.equal(JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users).length,1);
      await field('email','reader@example.test');await fits(page);
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${lang}-${width}-users.png`),fullPage:true});
      await save();assert.equal(await page.$eval('[data-users-save]',node=>node.disabled),true);
      assert.equal(JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users)[0].role,'limited_admin');
      await field('name','Changed reader');await field('email','revised@example.test');await field('role','super_admin');
      nextUsersMode='lose';await save();
      let users=JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users);assert.equal(users[0].email,'revised@example.test');assert.equal(users[0].role,'super_admin');
      await field('name','Unsaved reader');nextUsersMode='fail';await page.click('[data-users-save]');
      await page.waitForFunction(message=>document.querySelector('[data-users-status]').textContent===message,{},copy.errors.request_failed);
      assert.equal(await page.$eval('[data-user-card] [name=name]',node=>node.value),'Unsaved reader');
      assert.equal(await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});dispatchEvent(event);return event.defaultPrevented;}),true);
      await save();
      await page.click('[data-user-card]:first-child button');await save();
      users=JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users);assert.equal(users.length,1);assert.equal(users[0].email,'admin@example.test');
    }finally{await f.close();}
  });
  for(const width of [1440,320])await test(`Limited-admin has working Community tools and no Users entry (${width}px)`,async()=>{
    const f=await fixture('en',width,{role:'limited_admin'}),{page}=f;
    try{
      assert.equal(await page.$('#community-tab-users'),null);assert.equal(await page.$('#community-users'),null);
      assert.equal(await page.$('.community-admin__mobile-tabs option[value=users]'),null);
      const forbidden=await page.evaluate(()=>fetch('/api/community/v1/admin/users').then(response=>response.status));assert.equal(forbidden,403);
      await openScript(page,'Limited admin script','Local writer');await saveScript(page,1);
      assert.deepEqual(await titles(page),['Limited admin script']);
      await page.evaluate(()=>sessionStorage.setItem('community:admin-tab','users'));await page.reload();
      await page.waitForSelector('[data-admin-workspace][aria-busy="false"]');assert.equal(await page.$('#community-tab-users'),null);
      assert.equal(await page.$eval('#community-events',node=>node.hidden),false);
    }finally{await f.close();}
  });
  await test('Users drafts survive tab actions and concurrent edits; revoked access clears private user data',async()=>{
    const f=await fixture(),{page,db,copy}=f;
    try{
      await selectTab(page,'users');await page.waitForSelector('[data-user-card]');
      await page.$eval('[data-user-card] [name=name]',node=>{node.value='My draft';node.dispatchEvent(new Event('input',{bubbles:true}));});
      await selectTab(page,'events');
      let prompts=0;page.on('dialog',async dialog=>{prompts++;await dialog.dismiss();});
      await page.click('[data-admin-create]');await page.waitForSelector('[data-admin-editor][open]');
      await page.keyboard.press('Escape');await page.waitForSelector('[data-admin-editor]:not([open])');
      await selectTab(page,'users');
      assert.equal(prompts,0,'opening an event does not discard a Users draft');
      assert.equal(await page.$eval('[data-user-card] [name=name]',node=>node.value),'My draft');
      let directory=JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users);
      directory[0].name='Saved elsewhere';
      await db.prepare('UPDATE community_admin_directory SET users=?,revision=revision+1 WHERE id=1').bind(JSON.stringify(directory)).run();
      await page.click('[data-users-save]');
      await page.waitForFunction(message=>document.querySelector('[data-users-status]').textContent===message,{},copy.errors.users_changed);
      assert.equal(await page.$eval('[data-user-card] [name=name]',node=>node.value),'My draft');
      assert.equal(JSON.parse((await db.prepare('SELECT users FROM community_admin_directory').first()).users)[0].name,'Saved elsewhere');
      await page.click('[data-users-discard]');
      assert.equal(prompts,1);assert.equal(await page.$eval('[data-user-card] [name=name]',node=>node.value),'My draft');
      page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.accept());
      await page.click('[data-users-discard]');
      await page.waitForFunction(()=>document.querySelector('[data-user-card] [name=name]').value==='Saved elsewhere');
      await page.waitForNetworkIdle({idleTime:50});
      await db.prepare('DELETE FROM community_sessions').run();
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.waitForSelector('[data-admin-login]:not([hidden])');
      assert.equal(await page.$('[data-user-card]'),null);
      assert.equal(await page.$eval('[data-admin-status]',node=>node.textContent),copy.sessionExpired);
    }finally{await f.close();}
  });
  await test('touch tablet uses reorder buttons without desktop drag handles',async()=>{
    const f=await fixture('en',768),{page,copy}=f;
    try{
      await page.setViewport({width:768,height:1024,hasTouch:true});
      for(let i=1;i<=2;i++){await openScript(page,`Script ${i}`,`Writer ${i}`);await saveScript(page,i);}
      assert(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches));
      assert.equal(await page.$eval('[data-queue-drag]',node=>getComputedStyle(node).display),'none');
      await page.tap('[data-admin-queue] li:last-child [data-queue-control="up"]');
      await page.waitForFunction(message=>document.querySelector('[data-queue-status]').textContent===message,{},copy.actionDone);
      assert.deepEqual(await titles(page),['Script 2','Script 1']);
      await fits(page);
    }finally{await f.close();}
  });
  await test('desktop grip dragging shows insertion positions and saves the dropped order',async()=>{
    const f=await fixture('en',1440),{page,copy}=f;
    try{
      await page.setViewport({width:1440,height:1600});
      for(let i=1;i<=3;i++){await openScript(page,`Script ${i}`,`Writer ${i}`);await saveScript(page,i);}
      const inputMode=await page.evaluate(()=>({hover:matchMedia('(hover: hover)').matches,finePointer:matchMedia('(pointer: fine)').matches}));
      assert.deepEqual(inputMode,{hover:true,finePointer:true},'desktop drag fixture has a mouse with hover support');
      await page.setDragInterception(true);
      const drag=async(from,to,after=false)=>{
        const rows=await page.$$('[data-queue-id]'),handle=await rows[from].$('[data-queue-drag]');
        assert.equal(await handle.evaluate(node=>getComputedStyle(node).cursor),'grab');
        const source=await handle.boundingBox(),target=await rows[to].boundingBox();
        const start={x:source.x+source.width/2,y:source.y+source.height/2};
        const end={x:target.x+target.width/2,y:target.y+(after?target.height-8:8)};
        let timer;
        const data=await Promise.race([page.mouse.drag(start,end),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Desktop drag did not start')),5000);})]).finally(()=>clearTimeout(timer));
        await page.mouse.dragEnter(end,data);await page.mouse.dragOver(end,data);
        assert.equal(await rows[to].evaluate(node=>node.dataset.drop),after?'after':'before');
        if(screenshots)await page.screenshot({path:path.join(screenshots,`en-1440-drag-${after?'after':'before'}.png`),fullPage:true});
        await page.mouse.drop(end,data);await page.mouse.up();
        await page.waitForFunction(message=>document.querySelector('[data-queue-status]').textContent===message,{},copy.actionDone);
        assert.equal(await page.$('[data-drop],.is-dragging'),null);
      };
      await drag(2,0);assert.deepEqual(await titles(page),['Script 3','Script 1','Script 2']);
      assert.equal((await readings(page))[0].title,'Script 3');
      await drag(0,2,true);assert.deepEqual(await titles(page),['Script 1','Script 2','Script 3']);
      await page.focus('[data-admin-queue] li:last-child [data-queue-drag]');await page.keyboard.press('ArrowUp');
      await page.waitForFunction(message=>document.querySelector('[data-queue-status]').textContent===message,{},copy.actionDone);
      assert.deepEqual(await titles(page),['Script 1','Script 3','Script 2']);
      assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-queue-id]')?.querySelector('strong').textContent),'Script 3');
      await page.reload();await page.waitForSelector('[data-admin-workspace][aria-busy="false"]:not([hidden])');await selectTab(page,'queue');
      assert.deepEqual(await titles(page),['Script 1','Script 3','Script 2']);
    }finally{await page.mouse.up().catch(()=>{});await f.close();}
  });
}finally{releaseAction?.();releaseState?.();await Promise.allSettled([...runtimes].map(runtime=>runtime.dispose()));await browser.close();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
