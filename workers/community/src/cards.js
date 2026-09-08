import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { sha256Hex } from '@dustwave/worker-core/crypto';
import { escape, monthLabel, weekdayLabels, copy } from './render.js';
import { API } from './domain.js';

let initialized;
export async function initCardRenderer(wasm) {
  initialized ||= initWasm(wasm);
  await initialized;
}
function lines(text, width = 20, max = 2) {
  const words = String(text).split(/\s+/u); const result = []; let row='';
  for (const word of words) {
    if ((row+' '+word).trim().length > width && row) { result.push(row); row=''; }
    row = (row+' '+word).trim();
  }
  if(row) result.push(row);
  return result.slice(0,max).map((s,i)=> i===max-1 && result.length>max ? `${s.slice(0,width-1)}…` : s.length>width ? `${s.slice(0,width-1)}…`:s);
}
export function cardSvg(view) {
  const label=monthLabel(view.month,view.language).toLocaleUpperCase(view.language);
  const x0=32, y0=194, width=1136/7, rows=Math.ceil((view.offset+view.days)/7), height=378/rows;
  const text=(x,y,value,size=16,color='#17120f')=>`<text x="${x}" y="${y}" font-family="Inter" font-size="${size}" fill="${color}">${escape(value)}</text>`;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f4eddf"/><rect x="24" y="24" width="1152" height="582" fill="none" stroke="#17120f" stroke-width="2"/><rect x="24" y="24" width="1152" height="120" fill="#4a8eaa"/>${text(46,62,'DUST WAVE MICROCINEMA',22)}${text(44,119,label,49)}${text(46,170,copy(view.language).atHQ,17)}`;
  for(let i=0;i<7;i++) svg+=text(x0+i*width+8,y0-7,weekdayLabels(view.language)[i].toLocaleUpperCase(view.language),14);
  for(let i=0;i<=7;i++) svg+=`<path d="M${x0+i*width} ${y0}V${y0+rows*height}" stroke="#17120f" opacity=".5"/>`;
  for(let i=0;i<=rows;i++) svg+=`<path d="M${x0} ${y0+i*height}H${x0+7*width}" stroke="#17120f" opacity=".5"/>`;
  for(let day=1;day<=view.days;day++) {
    const index=view.offset+day-1, x=x0+(index%7)*width, y=y0+Math.floor(index/7)*height;
    const events=view.events.filter(e=>Number(e.date.slice(-2))===day);
    if(events.length) svg+=`<rect x="${x+1}" y="${y+1}" width="${width-2}" height="${height-2}" fill="#a8d6e7" opacity=".35"/>`;
    svg+=text(x+7,y+23,day,22,events.length?'#21617c':'#736a5d');
    if(events.length) {
      const title=(events[0].status==='cancelled'?'× ':'')+events[0].title;
      for(const [j,line] of lines(title,20,2).entries()) svg+=text(x+7,y+42+j*15,line,12.5);
      if(events.length>1) svg+=text(x+width-35,y+21,`+${events.length-1}`,12);
    }
  }
  return svg+text(42,594,'dustwave.xyz',15)+text(670,594,copy(view.language).timezone,13)+'</svg>';
}
export async function renderCard(view, font) {
  const renderer=new Resvg(cardSvg(view),{font:{fontBuffers:[new Uint8Array(font)],loadSystemFonts:false,defaultFontFamily:'Inter'},fitTo:{mode:'width',value:1200}});
  try { const rendered=renderer.render(); try{return rendered.asPng();}finally{rendered.free();} } finally { renderer.free(); }
}
export async function ensureCard(view, env, font) {
  const digest=(await sha256Hex(JSON.stringify({version:1,month:view.month,language:view.language,events:view.events}))).slice(0,24);
  const path=`cards/${view.language}/${view.month}/${digest}.png`;
  if(!await env.COMMUNITY_FILES.head(path)) await env.COMMUNITY_FILES.put(path,await renderCard(view,font),{httpMetadata:{contentType:'image/png'}});
  return `${API}/${path}`;
}
