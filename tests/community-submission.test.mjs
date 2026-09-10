import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import nunjucks from 'nunjucks';
import * as sass from 'sass';
import puppeteer from 'puppeteer';

const root=new URL('../',import.meta.url),read=file=>readFile(new URL(file,root),'utf8');
const template=await read('src/_includes/community/form.njk');
const i18n=Object.fromEntries(await Promise.all(['en','es'].map(async lang=>[lang,JSON.parse(await read(`src/_data/i18n/${lang}.json`))])));
const renderer=new nunjucks.Environment(null,{autoescape:true});
renderer.addFilter('safeJsonLd',value=>JSON.stringify(value).replace(/</g,'\\u003c'));
const styles=['theme','community'].map(name=>sass.compile(fileURLToPath(new URL(`src/scss/${name}.scss`,root)),{logger:sass.Logger.silent}).css).join('\n');
const assets=new Map();
for(const [prefix,directory] of [['/js/community/','src/js/community/'],['/js/dust-wave-admin-shell/','shared/dust-wave-platform/packages/admin-shell/src/'],['/fonts/','src/fonts/']]){
  for(const name of await readdir(new URL(directory,root)))if(/\.(js|woff2?)$/.test(name))assets.set(prefix+name,await readFile(new URL(directory+name,root)));
}
assets.set('/js/share-actions.js',await read('src/js/share-actions.js'));
let grants=0,submissions=0;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(assets.has(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'font/woff2');res.end(assets.get(url.pathname));return;}
  if(url.pathname==='/theme.css'){res.setHeader('Content-Type','text/css');res.end(styles);return;}
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  if(url.pathname==='/api/community/v1/config'){json({local:true,siteKey:'fixture-site'});return;}
  if(url.pathname==='/api/community/v1/uploads'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const data=JSON.parse(Buffer.concat(chunks));
    if(data.turnstileToken!=='verified-fixture'){json({error:'challenge_required'},400);return;}
    grants++;json({id:'fixture-upload',token:'private-fixture-grant',url:'/api/community/v1/uploads/fixture-upload'},201);return;
  }
  if(url.pathname==='/api/community/v1/uploads/fixture-upload'){for await(const _ of req){}json({ready:true,pages:1});return;}
  if(['/api/community/v1/scripts','/api/community/v1/events'].includes(url.pathname)){
    for await(const _ of req){}submissions++;json(submissions===1?{error:'request_failed'}:{id:'fixture-receipt'},submissions===1?503:201);return;
  }
  const language=url.pathname.startsWith('/es/')?'es':'en',communityKind=url.searchParams.has('event')?'event':'script';
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="${language}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/theme.css"></head><body class="writers-group-shell"><main class="container writers-group-page"><div class="writers-group-body"><section class="community-section">${renderer.renderString(template,{language,i18n,communityKind})}</section></div></main></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
const screenshots=process.env.COMMUNITY_ADMIN_SCREENSHOTS;
if(screenshots)await mkdir(screenshots,{recursive:true});
try{
  for(const language of ['en','es'])for(const width of [1440,320])await test(`visible script form requires verification and retires the widget after success (${language}, ${width}px)`,async()=>{
    grants=0;submissions=0;
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setViewport({width,height:1000});await page.setRequestInterception(true);
    page.on('request',req=>req.url().startsWith(origin)?req.continue():req.abort());
    await page.evaluateOnNewDocument(()=>{
      window.renders=0;window.removals=0;
      window.turnstile={render(root,options){
        window.challengeOptions=options;window.renders++;
        const widget=document.createElement('div');widget.dataset.fixtureChallenge='';widget.textContent='Cloudflare Turnstile layout fixture';
        Object.assign(widget.style,{width:options.size==='compact'?'150px':'100%',minWidth:options.size==='compact'?'150px':'300px',height:options.size==='compact'?'140px':'65px',background:'#333',border:'1px solid #aaa',padding:'10px',lineHeight:'1.4'});
        root.append(widget);return 'widget';
      },remove(){window.removals++;document.querySelector('[data-community-challenge]').replaceChildren();},reset(){}};
    });
    const copy=i18n[language].community;
    try{
      await page.goto(origin+(language==='es'?'/es/':'/'));
      await page.waitForSelector('[data-fixture-challenge]');
      assert.equal(await page.$eval('[data-community-form]',node=>Boolean(node.closest('details'))),false);
      assert.equal(await page.evaluate(()=>window.challengeOptions.action),'community_submit');
      const layout=await page.evaluate(()=>{
        const wrapper=document.querySelector('.community-submit'),root=document.querySelector('[data-community-challenge]'),widget=root.firstElementChild.getBoundingClientRect(),button=root.nextElementSibling.getBoundingClientRect();
        return {border:getComputedStyle(wrapper).borderBottomWidth,right:widget.right,left:widget.left,formRight:root.closest('form').getBoundingClientRect().right,gap:button.top-widget.bottom,width:document.documentElement.scrollWidth};
      });
      assert.equal(layout.border,'0px');assert.equal(layout.width,width);assert(layout.right<=layout.formRight);assert(layout.right<width);assert(layout.gap>=24);
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${language}-${width}-script-form.png`),fullPage:true});
      await page.evaluate(()=>{
        const form=document.querySelector('[data-community-form]');
        for(const [name,value] of Object.entries({title:'Test script',author:'Test author',contactName:'Private name',email:'test@example.test'}))form.elements[name].value=value;
        form.elements.local.checked=true;form.elements.consent.checked=true;
        const files=new DataTransfer();files.items.add(new File(['%PDF-1.7 fixture'],'private.pdf',{type:'application/pdf'}));form.elements.file.files=files.files;form.elements.file.dispatchEvent(new Event('change'));
      });
      await page.click('[type="submit"]');await page.waitForFunction(text=>document.querySelector('[data-form-status]').textContent===text,{},copy.errors.challenge_required);assert.equal(grants,0);
      await page.evaluate(()=>{window.challengeOptions.callback('verified-fixture');window.challengeOptions['expired-callback']();});
      await page.click('[type="submit"]');assert.equal(grants,0);
      await page.evaluate(()=>window.challengeOptions.callback('verified-fixture'));
      await page.click('[type="submit"]');await page.waitForFunction(text=>document.querySelector('[data-form-status]').textContent===text,{},copy.errors.request_failed);
      assert.equal(grants,1);assert.equal(submissions,1);assert.equal(await page.$eval('[name="title"]',node=>node.value),'Test script');
      await page.click('[type="submit"]');await page.waitForSelector('fieldset[hidden]');
      assert.equal(grants,1,'retry uses the verified upload grant');assert.equal(submissions,2);
      assert.equal(await page.evaluate(()=>window.removals),1);const renders=await page.evaluate(()=>window.renders);
      await page.setViewport({width:width===320?1440:320,height:1000});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(()=>window.renders),renders);assert.equal(await page.$('[data-fixture-challenge]'),null);
      assert((await page.$eval('[data-form-status]',node=>node.textContent)).includes(copy.success));
      assert.deepEqual(errors,[]);
      await page.setViewport({width,height:1000});
      await page.goto(origin+(language==='es'?'/es/':'/')+'?event');await page.waitForSelector('[data-fixture-challenge]');
      assert.equal(await page.$eval('[data-community-form]',node=>Boolean(node.closest('details'))),false,'event proposals are immediately available');
      assert.equal(await page.$eval('.community-submit',node=>getComputedStyle(node).borderBottomWidth),'0px');
      assert(await page.$eval('[name="title"]',node=>node.checkVisibility()));
      assert(await page.$eval('[data-community-challenge]',node=>node.getBoundingClientRect().right<innerWidth));
      if(screenshots)await page.screenshot({path:path.join(screenshots,`${language}-${width}-event-form.png`),fullPage:true});
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
