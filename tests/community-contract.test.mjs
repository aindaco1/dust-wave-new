import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('Community translations cover the same public and admin interface in both languages',async()=>{
  const en=JSON.parse(await read('src/_data/i18n/en.json')).community;
  const es=JSON.parse(await read('src/_data/i18n/es.json')).community;
  const keys=(value,prefix='')=>Object.entries(value).flatMap(([k,v])=>typeof v==='object'?keys(v,prefix+k+'.'):[prefix+k]);
  assert.deepEqual(keys(en).sort(),keys(es).sort());
  for(const translations of [en,es])for(const value of Object.values(translations))if(typeof value==='string')assert(value.trim());
});
test('both server-rendered slots, additive bundles and shared admin modules are build inputs',async()=>{
  for(const page of ['microcinema','writers-group']){
    const source=await read(`src/${page}.njk`);
    assert.match(source,/cssBundle: community/);assert.match(source,/data-community-slot="1"/);assert.match(source,/community\/form.njk/);
  }
  const gulp=await read('gulpfile.js');
  assert.match(gulp,/community\.min\.css/);assert.match(gulp,/community-admin\.min\.css/);assert.match(gulp,/workers\/community\/src\/render\.js/);
  const admin=await read('src/js/community/admin.js');
  for(const primitive of ['passwordless-session','tabs','confirmation-dialog','unsaved-changes','dirty-controls','credentialed-download'])assert(admin.includes(`dust-wave-admin-shell/${primitive}.js`));
});
