import assert from 'node:assert/strict';
const origin=new URL(process.argv[2]||'https://dustwave-community-staging.jogo.workers.dev').origin;
const get=async path=>{const response=await fetch(new URL(path,origin));assert(response.ok,`${path}: ${response.status}`);return response;};
const config=await (await get('/api/community/v1/config')).json();
assert.equal(config.local,false);assert(config.siteKey);assert.equal(config.timezone,'America/Denver');
const calendar=await (await get('/api/community/v1/calendar')).json();
const meetings=await (await get('/api/community/v1/meetings')).json();
for(const value of [calendar,meetings])assert.doesNotMatch(JSON.stringify(value),/"(?:pdfId|fileKey|email|contactName|token_hash)"/);
assert(meetings.meetings.length);assert(meetings.meetings.every(m=>m.readings.length<=2));
const [year,month]=calendar.current.split('-').map(Number);
const months=Array.from({length:3},(_,index)=>new Date(Date.UTC(year,month-1+index,1)).toISOString().slice(0,7));
const cards=new Set();
for(const language of ['en','es']){
  const prefix=language==='es'?'/es':'';
  for(const month of months){
    const response=await get(`${prefix}/microcinema.html?month=${month}`);
    const html=await response.text();assert.match(html,/data-community-calendar/);assert.doesNotMatch(html,/class="community-unavailable"/);
    assert.match(response.headers.get('Cache-Control'),/no-store/);
    assert(html.includes(`month=${month}`));
    const card=html.match(/property="og:image" content="([^"]+)"/)[1];
    assert(card.startsWith(`${origin}/api/community/v1/cards/${language}/${month}/`));cards.add(card);
    const image=await get(card);assert.match(image.headers.get('Content-Type'),/image\/png/);
    const bytes=await image.arrayBuffer();const view=new DataView(bytes);assert.equal(view.getUint32(16),1200);assert.equal(view.getUint32(20),630);
  }
  assert.match(await (await get(`${prefix}/writers-group.html`)).text(),/class="community-meetings"/);
  const admin=await get(`${prefix}/admin/community/`);assert.match(admin.headers.get('Cache-Control'),/no-store/);
  assert.equal(admin.headers.get('X-Frame-Options'),'DENY');assert.match(admin.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
}
assert.equal(cards.size,6);
for(const path of ['/admin/state','/admin/scripts/not-a-script/pdf'])assert.equal((await fetch(`${origin}/api/community/v1${path}`)).status,401);
assert.equal((await fetch(`${origin}/microcinema.html?month=2026-13`)).status,400);
assert.equal((await fetch(`${origin}/api/community/v1/calendar?month=${calendar.current}&month=${calendar.current}`)).status,400);
const css=await (await get('/css/community.min.css')).text();
for(const selector of ['community-calendar__day','community-calendar--list','community-event--cancelled','community-meeting'])assert(css.includes(selector),`Missing purged selector ${selector}`);
console.log(`Community deployed smoke passed: ${origin}; six month PNGs, EN/ES pages, admin headers, private-route denials and production styles.`);
