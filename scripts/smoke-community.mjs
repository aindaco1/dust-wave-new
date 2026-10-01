import assert from 'node:assert/strict';
const origin=new URL(process.argv[2]||'https://dustwave-community-staging.jogo.workers.dev').origin;
const get=async path=>{const response=await fetch(new URL(path,origin));assert(response.ok,`${path}: ${response.status}`);return response;};
const config=await (await get('/api/community/v1/config')).json();
assert.equal(config.local,false);assert(config.siteKey);assert.equal(config.timezone,'America/Denver');
const meetings=await (await get('/api/community/v1/meetings')).json();
assert.doesNotMatch(JSON.stringify(meetings),/"(?:pdfId|fileKey|email|contactName|token_hash)"/);
assert(meetings.meetings.length);assert(meetings.meetings.every(m=>m.readings.length<=2));
for(const language of ['en','es']){
  const prefix=language==='es'?'/es':'';
  for(const suffix of ['', '?month=2026-09', '?month=invalid'])for(const method of ['GET','HEAD']){
    const response=await fetch(`${origin}${prefix}/microcinema.html${suffix}`,{method,redirect:'manual'});
    assert.equal(response.status,301);assert.equal(response.headers.get('Location'),`https://dustwavemicrocinema.com${prefix}/`);
  }
  const html=await (await get(`${prefix}/writers-group.html`)).text();
  assert.match(html,/class="community-meetings"/);assert.match(html,/data-community-form="script"/);
  assert(html.includes(`https://dustwavemicrocinema.com${prefix}/`));
  const admin=await get(`${prefix}/admin/community/`);assert.match(admin.headers.get('Cache-Control'),/no-store/);
  assert.equal(admin.headers.get('X-Frame-Options'),'DENY');assert.match(admin.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
  const adminHtml=await admin.text();assert.doesNotMatch(adminHtml,/data-admin-events|data-admin-create|community-tab-events/);
  assert.match(adminHtml,/https:\/\/dustwavemicrocinema.com\/admin\//);
}
for(const path of ['/admin/state','/admin/scripts/not-a-script/pdf'])assert.equal((await fetch(`${origin}/api/community/v1${path}`)).status,401);
for(const path of ['/events','/calendar','/images/legacy/320.webp','/cards/en/2026-09/legacy.png']){
  const response=await fetch(`${origin}/api/community/v1${path}`);assert.equal(response.status,410);
  assert.equal((await response.json()).url,'https://dustwavemicrocinema.com/');
}
const css=await (await get('/css/community.min.css')).text();
assert(css.includes('community-meeting'));assert(!css.includes('community-calendar__day'));
console.log(`Community deployed smoke passed: ${origin}; bilingual redirects, Writers Group readings and form, retired event routes, admin headers and private-route denials.`);
