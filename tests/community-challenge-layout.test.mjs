import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import * as sass from 'sass';
import puppeteer from 'puppeteer';

const root=new URL('../',import.meta.url);
const styles=sass.compileString(await readFile(new URL('src/scss/themes/base/_community.scss',root),'utf8')).css;
const assets=new Map(await Promise.all([
  ['/js/community/common.js','src/js/community/common.js'],
  ...['api-client','turnstile','turnstile-browser'].map(name=>[
    `/js/dust-wave-admin-shell/${name}.js`,`shared/dust-wave-platform/packages/admin-shell/src/${name}.js`
  ])
].map(async([url,path])=>[url,await readFile(new URL(path,root),'utf8')])));
const server=createServer((req,res)=>{
  if(assets.has(req.url)){res.setHeader('Content-Type','text/javascript');res.end(assets.get(req.url));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="en"><head><style>body{margin:0}.community-form{width:calc(100% - 48px);margin:24px}*{box-sizing:border-box}${styles}</style></head><body>
    <form class="community-form"><fieldset><label>Event name<input name="title" value="Retained draft"></label><div data-community-challenge></div><button type="submit">Send for review</button></fieldset></form>
    <script id="community-copy" type="application/json">{}</script>
    <script type="module">
      import {mountChallenge} from '/js/community/common.js';
      let callback;window.sizes=[];window.removals=0;window.resets=0;
      // A local layout fixture only; no production challenge or API is contacted.
      window.turnstile={render(root,options){
        window.sizes.push(options.size);callback=options.callback;
        const iframe=document.createElement('iframe');iframe.title='Verification layout fixture';iframe.style.border='0';
        iframe.style.width=options.size==='compact'?'150px':'100%';iframe.style.minWidth=options.size==='compact'?'150px':'300px';iframe.style.height=options.size==='compact'?'140px':'65px';
        root.append(iframe);return 'fixture-widget';
      },remove(){window.removals++;document.querySelector('[data-community-challenge]').replaceChildren();},reset(){window.resets++;}};
      window.challenge=await mountChallenge(document.querySelector('[data-community-challenge]'),{siteKey:'local-layout-fixture'},'community_submit');
      window.verifyFixture=()=>callback('local-fixture-token');window.ready=true;
    </script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
  await test('verification stays within form gutters and separated from submit across resizing',async()=>{
    const page=await browser.newPage();await page.setViewport({width:1440,height:844});
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready);
    for(const width of [1440,390,320,375,768,320,1440]){
      await page.setViewport({width,height:844});
      await page.waitForFunction(()=>{
        const box=document.querySelector('[data-community-challenge]');
        return window.sizes.at(-1)===globalThis.DustWaveAdminShellTurnstile.responsiveSize(box);
      });
      const state=await page.evaluate(()=>{
        const box=document.querySelector('[data-community-challenge]'),frame=box.querySelector('iframe').getBoundingClientRect(),form=box.closest('form').getBoundingClientRect(),button=box.nextElementSibling.getBoundingClientRect();
        return {left:frame.left,right:frame.right,formLeft:form.left,formRight:form.right,gap:button.top-frame.bottom,pageWidth:document.documentElement.scrollWidth,draft:document.querySelector('[name="title"]').value};
      });
      assert(state.left>=state.formLeft&&state.right<=state.formRight);
      assert(state.right<=width-24);assert(state.gap>=24);assert.equal(state.pageWidth,width);assert.equal(state.draft,'Retained draft');
    }
    // Reverification is needed only when the size category changes, not every resize.
    await page.evaluate(()=>window.verifyFixture());
    const before=await page.evaluate(()=>({token:window.challenge.token(),count:window.sizes.length}));
    await page.setViewport({width:1000,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await page.evaluate(()=>({token:window.challenge.token(),count:window.sizes.length})),before);
    await page.setViewport({width:320,height:844});await page.waitForFunction(()=>window.sizes.at(-1)==='compact');
    assert.equal(await page.evaluate(()=>{try{window.challenge.token();return '';}catch(error){return error.message;}}),'challenge_required');
    await page.evaluate(()=>window.challenge.reset());assert.equal(await page.evaluate(()=>window.resets),1);
    assert.equal(await page.evaluate(()=>window.removals),5);
    await page.close();
  });
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
