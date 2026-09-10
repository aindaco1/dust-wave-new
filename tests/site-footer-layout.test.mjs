import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import nunjucks from 'nunjucks';
import * as sass from 'sass';
import puppeteer from 'puppeteer';
const root=new URL('../',import.meta.url);
const renderer=new nunjucks.Environment(new nunjucks.FileSystemLoader(fileURLToPath(new URL('src/_includes/',root))),{autoescape:true});
const i18n=Object.fromEntries(await Promise.all(['en','es','config'].map(async key=>[key,JSON.parse(await readFile(new URL(`src/_data/i18n/${key}.json`,root),'utf8'))])));
renderer.addFilter('t',(data,language,key)=>key.split('.').reduce((value,part)=>value[part],data[language]));
renderer.addFilter('localizedUrl',(data,language,key,fallback)=>data.config.pages[key]?.[language]||fallback);
const css=sass.compile(fileURLToPath(new URL('src/scss/theme.scss',root)),{logger:sass.Logger.silent}).css;
const browser=await puppeteer.launch({headless:true,args:process.env.CI?['--no-sandbox']:[]});
try{
 for(const language of ['en','es'])for(const shell of ['site-shell','community-admin-shell','podcast-admin-page','podcast-member-page'])await test(`footer fit, tap targets and short/long page flow (${shell}, ${language})`,async()=>{
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.abort());
  const footer=renderer.render('snippets/site-footer.njk',{language,i18n,translationKey:'home'});
  // External fonts are intentionally unavailable: the shared footer must also fit its fallback font.
  await page.setContent(`<!doctype html><html lang="${language}"><head><style>${css}</style></head><body class="${shell}"><main><h1>Page</h1></main>${footer}</body></html>`);
  for(const width of [320,390,575,576,768,991,992,1024,1440]){
   await page.setViewport({width,height:900});
   for(const contentHeight of [80,1200]){
    await page.$eval('main',(e,height)=>e.style.minHeight=`${height}px`,contentHeight);
    const result=await page.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top+scrollY,bottom:r.bottom+scrollY,width:r.width,height:r.height};};
     const elements=[...document.querySelectorAll('.footer-social a,.site-footer__lang-link')];
     return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,footer:rect(document.querySelector('.site-footer')),main:rect(document.querySelector('main')),links:elements.map(rect),font:elements.slice(-2).map(e=>parseFloat(getComputedStyle(e).fontSize))};
    });
    assert.equal(result.scrollWidth,width,`no horizontal overflow at ${width}px`);
    assert(result.footer.bottom>=899&&result.footer.top>=result.main.bottom-1,'footer follows content and reaches viewport bottom');
    if(contentHeight<900)assert(Math.abs(result.footer.bottom-900)<=1,'short pages do not gain an unnecessary scrollbar');
    for(const link of result.links){assert(link.left>=8&&link.right<=width-8,'footer link stays inside gutters');assert(link.height>=43.9&&link.width>=43.9,'footer links have usable touch targets');}
    for(let i=0;i<result.links.length;i++)for(let j=i+1;j<result.links.length;j++){
     const a=result.links[i],b=result.links[j];assert(Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1,'footer link targets never overlap');
    }
    assert(result.font.every(size=>size>=12),'language labels remain readable');
   }
  }
  await page.close();
 });
}finally{await browser.close();}
