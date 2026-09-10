import puppeteer from 'puppeteer';
import {mkdir,writeFile} from 'node:fs/promises';
// Read-only visual review: all outbound submissions are blocked.
const origin=new URL(process.env.QA_ORIGIN||'http://localhost:8787').origin,out=process.env.QA_OUTPUT||'.artifacts/responsive';
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
const routes=(process.env.QA_ROUTES||'/,/news.html,/microcinema.html,/writers-group.html,/contact.html,/branded-content.html,/project/cutnotes.html,/project/record.html,/admin/community/').split(',');
const widths=(process.env.QA_WIDTHS||'320,390,768,1024,1440').split(',').map(Number),results=[],queue=[];
for(const lang of ['en','es'])for(const route of routes)for(const width of widths)queue.push({lang,route,width});
try{await Promise.all(Array.from({length:2},async()=>{
 const page=await browser.newPage();await page.setRequestInterception(true);
 page.on('request',r=>{const u=new URL(r.url());if(r.method()==='GET'&&(u.origin===origin||u.hostname.endsWith('typekit.net')||u.hostname==='challenges.cloudflare.com'||['data:','blob:'].includes(u.protocol)))r.continue();else r.abort();});
 while(queue.length){const {lang,route,width}=queue.shift(),url=origin+(lang==='es'?'/es':'')+route;
  const key=`${lang}-${route==='/'?'home':route.split('/').filter(Boolean).join('-').replace('.html','')}-${width}`;
  await page.setViewport({width,height:900});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForNetworkIdle({idleTime:300,timeout:4000}).catch(()=>{});
   await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,5000))]));
   const metrics=await page.evaluate(()=>{
    const visible=e=>{if(e.closest('[aria-hidden="true"]'))return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
    const box=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+scrollY),width:Math.round(r.width),height:Math.round(r.height),text:e.textContent.trim().slice(0,75),selector:e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'?'.'+e.className.trim().replaceAll(' ','.'):'')};};
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,font:getComputedStyle(document.querySelector('h1')).fontFamily,headings:[...document.querySelectorAll('main h1,main h2')].filter(visible).map(box),footer:[...document.querySelectorAll('.site-footer__item')].map(box),overflow:[...document.querySelectorAll('main *,footer *')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1;}).slice(0,12).map(box)};
   });
   results.push({key,url,status:response.status(),...metrics,errors});
   if([320,768,1440].includes(width)){
    await page.screenshot({path:`${out}/${key}-top.png`});
    for(const [name,selector]of [['footer','.site-footer'],['form','[data-community-form],#contact-form,#inquiry'],['calendar','.community-calendar']]){
     const element=await page.$(selector);if(element){await element.evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:`${out}/${key}-${name}.png`});}
    }
   }
  }catch(e){results.push({key,url,error:e.message});}
  page.off('pageerror',onError);
 }
 await page.close();
}));}finally{await browser.close();}
await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({pages:results.length,failed:results.filter(r=>r.error||r.status!==200||r.scrollWidth>r.width||r.overflow?.length).map(r=>({key:r.key,status:r.status,error:r.error,overflow:r.overflow})),font:results[0]?.font},null,2));

if(results.some(r=>r.error||r.status!==200||r.scrollWidth>r.width||r.overflow?.length))process.exitCode=1;
