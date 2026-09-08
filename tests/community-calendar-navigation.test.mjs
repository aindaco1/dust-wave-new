import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import puppeteer from 'puppeteer';
import {renderCalendar,copy,monthLabel} from '../workers/community/src/render.js';

const assets=new Map(await Promise.all(['community/calendar-navigation.js','share-actions.js'].map(async name=>[
  '/js/'+name,await readFile(new URL('../src/js/'+name,import.meta.url),'utf8')
])));
let mode='normal',origin;
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,origin);
  if(assets.has(url.pathname)){res.setHeader('Content-Type','text/javascript');res.end(assets.get(url.pathname));return;}
  const language=url.pathname.startsWith('/es/')?'es':'en';
  const month=url.searchParams.get('month')||'2026-09';
  if(mode==='failure'&&url.search){res.writeHead(503);res.end('Unavailable');return;}
  if(mode==='race'&&month==='2026-10')await new Promise(resolve=>setTimeout(resolve,250));
  const date=new Date(`${month}-01T12:00:00Z`);
  const view={month,language,first:'2026-09',current:'2026-09',last:'2026-11',days:new Date(date.getFullYear(),date.getMonth()+1,0).getDate(),offset:(date.getDay()+6)%7,events:[]};
  const canonical=`${origin}${url.pathname}?month=${month}`;
  const title=monthLabel(month,language);
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="${language}"><head><title>${title}</title>
    <meta property="og:title" content="${title}"><meta property="og:image" content="${origin}/${month}.png"><link rel="canonical" href="${canonical}">
    <style>html{scroll-behavior:smooth}body{margin:0}header{height:1800px}.community-calendar__nav,.community-calendar__tools{display:flex;gap:1rem;padding:20px 0}.community-calendar__grid{height:700px;overflow:hidden}.community-calendar--list .community-calendar__grid{height:600px}footer{height:900px}.visually-hidden{position:absolute;clip-path:inset(50%);height:1px;width:1px;overflow:hidden}</style>
    </head><body><header>Venue information</header><section id="calendar"><div data-community-slot="1">${renderCalendar(view,origin)}</div>
    <details open><summary>Propose an event</summary><form data-community-form><input name="title" value="My draft event"></form></details></section>
    <footer><a data-lang-switcher-link href="/es/microcinema.html?month=${month}">Español</a></footer>
    <script type="module">import {mountCalendar} from '/js/community/calendar-navigation.js';mountCalendar(document.querySelector('[data-community-slot]'),${JSON.stringify(copy(language))});window.documentToken=crypto.randomUUID();window.ready=true;</script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});

async function settled(page,month){
  await page.waitForFunction(month=>document.querySelector('[data-community-share]').dataset.shareUrl.endsWith(`month=${month}#calendar`)&&!document.querySelector('[data-community-slot]').hasAttribute('aria-busy'),{},month);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function evidence(page){return page.evaluate(()=>({
  token:window.documentToken,y:scrollY,min:Math.min(...(window.scrollSamples||[scrollY])),max:Math.max(...(window.scrollSamples||[scrollY])),
  draft:document.querySelector('[name="title"]').value,url:location.href,
  title:document.title,image:document.querySelector('meta[property="og:image"]').content,
  canonical:document.querySelector('link[rel="canonical"]').href,language:document.querySelector('[data-lang-switcher-link]').href,
  list:document.querySelector('[data-community-calendar]').classList.contains('community-calendar--list')
}));}
async function watchScroll(page){await page.evaluate(()=>{
  window.scrollSamples=[scrollY];
  window.captureScroll=()=>window.scrollSamples.push(scrollY);
  window.addEventListener('scroll',window.captureScroll);
});}
function assertStable(before,after){
  assert.equal(after.token,before.token,'month navigation must not reload the document');
  assert.equal(after.draft,'My draft event');
  assert(Math.abs(after.y-before.y)<=1,`scroll moved from ${before.y} to ${after.y}`);
  assert(after.min>=before.y-1&&after.max<=before.y+1,'navigation must not animate or briefly jump');
}
try{
  for(const language of ['en','es'])for(const width of [1440,390]){
    await test(`shared month arrival scrolls once at ${width}px (${language})`,async()=>{
      mode='normal';
      const page=await browser.newPage();await page.setViewport({width,height:844});
      const path=`${language==='es'?'/es':''}/microcinema.html`;
      await page.goto(`${origin}${path}?month=2026-10`);
      await page.waitForFunction(()=>window.ready);
      assert.equal(await page.evaluate(()=>scrollY),0,'a URL without an anchor stays at the top');
      const shared=await page.$eval('[data-community-share]',el=>el.dataset.shareUrl);
      assert.equal(shared,`${origin}${path}?month=2026-10#calendar`);
      assert.equal(await page.$eval('[data-community-share] a',el=>el.href),shared);
      // Exercise the real copy/native-share handlers after extracting the shared URL.
      await page.evaluate(()=>{
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copiedMonth=value;}}});
        Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedMonth=data.url;}});
      });
      await page.click('[data-community-copy]');assert.equal(await page.evaluate(()=>window.copiedMonth),shared);
      await page.click('[data-community-share-native]');assert.equal(await page.evaluate(()=>window.sharedMonth),shared);
      // A fresh document uses native fragment navigation before any in-place changes.
      await page.goto('about:blank');await page.goto(shared);await page.waitForFunction(()=>window.ready);
      await page.waitForFunction(()=>Math.abs(document.querySelector('#calendar').getBoundingClientRect().top)<2);
      assert.equal(await page.$eval('#calendar-heading',el=>el.textContent),monthLabel('2026-10',language));
      assert((await page.evaluate(()=>scrollY))>1000);
      await watchScroll(page);const before=await evidence(page);
      await page.click('.community-calendar__nav > :last-child');await settled(page,'2026-11');assertStable(before,await evidence(page));
      await page.click('.community-calendar__nav > :first-child');await settled(page,'2026-10');assertStable(before,await evidence(page));
      // Native arrival and ordinary month links also work without the enhancement.
      const plainPage=await browser.newPage();await plainPage.setViewport({width,height:844});
      await plainPage.setJavaScriptEnabled(false);await plainPage.goto(shared);
      for(let attempt=0;attempt<40;attempt++){
        if(await plainPage.$eval('#calendar',el=>Math.abs(el.getBoundingClientRect().top)<2))break;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      assert(await plainPage.$eval('#calendar',el=>Math.abs(el.getBoundingClientRect().top)<2));
      assert.equal(await plainPage.$eval('#calendar-heading',el=>el.textContent),monthLabel('2026-10',language));
      await plainPage.close();
      await page.close();
    });
    await test(`month navigation stays in place at ${width}px (${language})`,async()=>{
      mode='normal';
      const page=await browser.newPage();await page.setViewport({width,height:844});
      await page.goto(`${origin}${language==='es'?'/es':''}/microcinema.html`);
      await page.waitForFunction(()=>window.ready);
      await page.evaluate(()=>scrollTo({top:document.querySelector('#calendar').offsetTop-80,behavior:'instant'}));
      await page.click('[data-calendar-view]');await watchScroll(page);
      const before=await evidence(page);
      await page.click('.community-calendar__nav > :last-child');await settled(page,'2026-10');
      let after=await evidence(page);assertStable(before,after);assert(after.list);
      assert(after.url.endsWith('month=2026-10#calendar'));assert(after.image.endsWith('/2026-10.png'));
      assert(after.canonical.endsWith('month=2026-10'));assert(after.language.endsWith('month=2026-10'));
      assert.equal(after.title,monthLabel('2026-10',language));
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),copy(language).next);
      await page.evaluate(()=>history.back());await settled(page,'2026-09');assertStable(before,await evidence(page));
      await page.evaluate(()=>history.forward());await settled(page,'2026-10');assertStable(before,await evidence(page));
      await page.click('.community-calendar__nav > :first-child');await settled(page,'2026-09');
      assertStable(before,await evidence(page));
      await page.select('#community-month','2026-11');await page.click('.community-calendar__tools [type="submit"]');await settled(page,'2026-11');
      assertStable(before,await evidence(page));
      await page.evaluate(()=>history.back());await settled(page,'2026-09');assertStable(before,await evidence(page));
      await page.evaluate(()=>history.forward());await settled(page,'2026-11');assertStable(before,await evidence(page));
      await page.click('.community-calendar__nav > :nth-child(2)');await settled(page,'2026-09');assertStable(before,await evidence(page));
      // The latest selection must win over a slower earlier month response.
      mode='race';
      await page.click('.community-calendar__nav > :last-child');
      await page.select('#community-month','2026-11');await page.click('.community-calendar__tools [type="submit"]');
      await settled(page,'2026-11');assertStable(before,await evidence(page));
      // A failed fetch keeps the calendar, URL and draft, without falling back to a reload.
      mode='failure';const failedBefore=await evidence(page);
      await page.click('.community-calendar__nav > :first-child');
      await page.waitForFunction(()=>!document.querySelector('[data-community-slot]').hasAttribute('aria-busy'));
      const failedAfter=await evidence(page);assertStable(before,failedAfter);assert.equal(failedAfter.url,failedBefore.url);
      assert.equal(await page.$eval('[data-community-slot] + [role="status"]',el=>el.textContent),copy(language).unavailable);
      mode='normal';await page.click('.community-calendar__nav > :first-child');await settled(page,'2026-10');assertStable(before,await evidence(page));
      await page.close();
    });
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
